import { db,getUser,asJson,isUuid,textValue,mutation,member,permission,json } from "@/lib/v3/community";
import { getRoomService } from "@/lib/livekit/server";
export const runtime="nodejs";
type Rights={channels:boolean;messages:boolean;moderation:boolean;roles:boolean};
type Role={id:string;priority:number;manage_channels:boolean;manage_messages:boolean;moderate_members:boolean;manage_roles:boolean};
type Actor={owner:boolean;rank:number;rights:Rights};
const keys:(keyof Rights)[]=["channels","messages","moderation","roles"];
const empty:Rights={channels:false,messages:false,moderation:false,roles:false};
// Removing a role assignment or deleting a role may revoke access to a
// private voice room. Reconcile only active, private voice rooms, checking
// effective permissions so users with another grant are not disconnected.
async function reconcileRoleVoicePermissions(serverId:string){
 const channels=await db<{id:string}>(
  "SELECT id FROM v3_channels WHERE server_id=$1 AND kind='voice' AND is_private AND archived_at IS NULL",
  [serverId]
 );
 if(!channels.length)return {disconnected:true,removedParticipants:0,failedRemovals:0};
 const roomToChannel=new Map(channels.map(c=>["v3-"+c.id,c.id] as const));
 const client=getRoomService();
 const active=await client.listRooms([...roomToChannel.keys()]);
 const activeRooms=active.filter(room=>roomToChannel.has(room.name));
 const participantGroups=await Promise.all(activeRooms.map(async room=>({
  roomName:room.name,channelId:roomToChannel.get(room.name)!,participants:await client.listParticipants(room.name)
 })));
 const checks=await Promise.all(participantGroups.flatMap(group=>
  group.participants.map(async p=>{
   if(!isUuid(p.identity))return {roomName:group.roomName,identity:p.identity,allowed:false};
   const permitted=await db<{allowed:boolean}>(
    "SELECT v3_can_read_channel($1::uuid,$2::uuid) AS allowed",
    [group.channelId,p.identity]
   );
   return {roomName:group.roomName,identity:p.identity,allowed:permitted[0]?.allowed===true};
  })
 ));
 const revoked=checks.filter(p=>!p.allowed);
 if(!revoked.length)return {disconnected:true,removedParticipants:0,failedRemovals:0};
 const revokeTokenTs=BigInt(Math.floor(Date.now()/1000)+30);
 const results=await Promise.allSettled(
  revoked.map(p=>client.removeParticipant(p.roomName,p.identity,{revokeTokenTs}))
 );
 const failedRemovals=results.filter(r=>r.status==="rejected").length;
 if(failedRemovals)console.error("LumaCall role-change disconnection incomplete",{serverId,failedRemovals});
 return {disconnected:failedRemovals===0,removedParticipants:results.length-failedRemovals,failedRemovals};
}
async function reportRoleVoiceCleanup(serverId:string){
 try{
  const cleanup=await reconcileRoleVoicePermissions(serverId);
  if(!cleanup.disconnected)return json({ok:true,...cleanup,warning:"Cargo alterado, mas algumas chamadas privadas não puderam ser atualizadas. Verifique as salas."});
  return json({ok:true,...cleanup});
 }catch{
  console.error("LumaCall role-change voice cleanup unverified",{serverId});
  return json({ok:true,disconnected:false,warning:"Cargo alterado, mas não foi possível confirmar a desconexão das chamadas privadas."});
 }
}

function parseRights(value:unknown):Rights|null{
 if(!value||typeof value!=="object"||Array.isArray(value))return null;
 const x=value as Record<string,unknown>;
 if(keys.some(k=>typeof x[k]!=="boolean"))return null;
 return {channels:x.channels===true,messages:x.messages===true,moderation:x.moderation===true,roles:x.roles===true};
}
function rightSet(role:Role):Rights{return {channels:role.manage_channels,messages:role.manage_messages,moderation:role.moderate_members,roles:role.manage_roles};}
function within(requested:Rights,granted:Rights){return keys.every(k=>!requested[k]||granted[k]);}
async function highest(serverId:string,userId:string){
 const r=await db<{rank:number}>("SELECT coalesce(max(r.priority),-1)::int AS rank FROM v3_member_roles mr JOIN v3_roles r ON r.id=mr.role_id AND r.server_id=mr.server_id WHERE mr.server_id=$1 AND mr.user_id=$2",[serverId,userId]);
 return r[0]?.rank??-1;
}
async function actorFor(serverId:string,userId:string):Promise<Actor|null>{
 const m=await member(serverId,userId);
 if(!m||!(await permission(serverId,userId,"roles")))return null;
 if(m.role==="owner")return {owner:true,rank:Infinity,rights:{channels:true,messages:true,moderation:true,roles:true}};
 const rights=await db<Rights>("SELECT v3_user_permission($1::uuid,$2::uuid,'channels') AS channels,v3_user_permission($1::uuid,$2::uuid,'messages') AS messages,v3_user_permission($1::uuid,$2::uuid,'moderation') AS moderation,v3_user_permission($1::uuid,$2::uuid,'roles') AS roles",[serverId,userId]);
 return {owner:false,rank:await highest(serverId,userId),rights:rights[0]||empty};
}
async function roleFor(serverId:string,roleId:string){
 const r=await db<Role>("SELECT id,priority,manage_channels,manage_messages,moderate_members,manage_roles FROM v3_roles WHERE server_id=$1 AND id=$2",[serverId,roleId]);
 return r[0]||null;
}
function fields(b:Record<string,unknown>){
 const name=textValue(b.name,32),color=typeof b.color==="string"?b.color:"#aaaaaa";
 const rank=typeof b.priority==="number"&&Number.isInteger(b.priority)&&b.priority>=0&&b.priority<=100?b.priority:null;
 const rights=parseRights(b.permissions);
 if(!/^[\p{L}\p{N}_ -]{2,32}$/u.test(name)||!/^#[\da-f]{6}$/i.test(color)||rank===null||!rights)return null;
 return {name,color,rank,rights};
}
function canEdit(a:Actor,r:Role){return a.owner||r.priority<a.rank;}
// Editing or deleting a role changes the permissions of EVERY holder.
// A delegated manager must never modify a role currently held by themselves,
// the owner, or an equal/higher ranked member, even if this role has low priority.
async function hasProtectedHolder(serverId:string,roleId:string,actorId:string,actorRank:number):Promise<boolean>{
 const rows=await db(
  "SELECT 1 FROM v3_member_roles a JOIN v2_memberships m ON m.server_id=a.server_id AND m.user_id=a.user_id "+
  "WHERE a.server_id=$1 AND a.role_id=$2 AND (a.user_id=$3 OR m.role='owner' "+
  "OR (SELECT coalesce(max(r.priority),-1) FROM v3_member_roles mr JOIN v3_roles r ON r.id=mr.role_id "+
  "AND r.server_id=mr.server_id WHERE mr.server_id=a.server_id AND mr.user_id=a.user_id)>=$4) LIMIT 1",
  [serverId,roleId,actorId,actorRank]
 );
 return rows.length>0;
}
function canCreate(a:Actor,p:{rank:number;rights:Rights}){return a.owner||(p.rank<a.rank&&within(p.rights,a.rights));}

export async function GET(request:Request){
 try{
  const u=await getUser();if(!u)return asJson("Entre na conta.",401);
  const id=new URL(request.url).searchParams.get("serverId");
  if(!isUuid(id)||!(await member(id,u.id)))return asJson("Servidor indisponível.",403);
  const [roles,assignments]=await Promise.all([
   db("SELECT id,server_id,name,color,priority,manage_channels,manage_messages,moderate_members,manage_roles FROM v3_roles WHERE server_id=$1 ORDER BY priority DESC,name",[id]),
   db("SELECT mr.user_id,mr.role_id FROM v3_member_roles mr JOIN v3_roles r ON r.id=mr.role_id AND r.server_id=mr.server_id WHERE mr.server_id=$1",[id])
  ]);
  return json({roles,assignments,canManage:await permission(id,u.id,"roles")});
 }catch{return asJson("Não foi possível carregar os cargos.",503);}
}
export async function POST(request:Request){
 const fail=mutation(request,"roles",12);if(fail)return fail;
 try{
  const u=await getUser();if(!u)return asJson("Entre na conta.",401);
  const b=await request.json() as Record<string,unknown>;
  if(!isUuid(b.serverId))return asJson("Servidor inválido.");
  const a=await actorFor(b.serverId,u.id);if(!a)return asJson("Sem permissão para criar cargos.",403);
  const p=fields(b);if(!p)return asJson("Dados de cargo inválidos.");
  if(!canCreate(a,p))return asJson("Não é possível criar um cargo com hierarquia ou permissões superiores.",403);
  const count=await db<{n:number}>("SELECT count(*)::int AS n FROM v3_roles WHERE server_id=$1",[b.serverId]);
  if((count[0]?.n||0)>=25)return asJson("Limite de 25 cargos.",409);
  const r=await db("INSERT INTO v3_roles(server_id,name,color,priority,manage_channels,manage_messages,moderate_members,manage_roles) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id",[b.serverId,p.name,p.color,p.rank,p.rights.channels,p.rights.messages,p.rights.moderation,p.rights.roles]);
  return json({role:r[0]});
 }catch(e){if(String(e).includes("23505"))return asJson("Cargo já existente.",409);return asJson("Não foi possível criar o cargo.",503);}
}
export async function PATCH(request:Request){
 const fail=mutation(request,"roles",36);if(fail)return fail;
 try{
  const u=await getUser();if(!u)return asJson("Entre na conta.",401);
  const b=await request.json() as Record<string,unknown>;
  if(!isUuid(b.serverId))return asJson("Servidor inválido.");
  const a=await actorFor(b.serverId,u.id);if(!a)return asJson("Sem permissão para gerenciar cargos.",403);
  if(b.action==="assign"||b.action==="unassign"){
   if(!isUuid(b.userId)||!isUuid(b.roleId))return asJson("Membro ou cargo inválido.");
   const r=await roleFor(b.serverId,b.roleId),target=await member(b.serverId,b.userId);
   if(!r||!target)return asJson("Cargo ou membro não encontrado.",404);
   if(!canEdit(a,r))return asJson("Cargo de hierarquia superior.",403);
   if(!a.owner&&(b.userId===u.id||target.role==="owner"||(await highest(b.serverId,b.userId))>=a.rank||!within(rightSet(r),a.rights)))
    return asJson("Você não pode alterar seus próprios cargos ou os de usuários de hierarquia igual ou superior.",403);
   if(b.action==="assign"){
    await db("INSERT INTO v3_member_roles(server_id,user_id,role_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",[b.serverId,b.userId,b.roleId]);
    return json({ok:true});
   }
   await db("DELETE FROM v3_member_roles WHERE server_id=$1 AND user_id=$2 AND role_id=$3",[b.serverId,b.userId,b.roleId]);
   return await reportRoleVoiceCleanup(b.serverId);
  }
  if(!isUuid(b.roleId))return asJson("Cargo inválido.");
  const r=await roleFor(b.serverId,b.roleId);if(!r)return asJson("Cargo não encontrado.",404);
  if(!canEdit(a,r))return asJson("Cargo de hierarquia superior.",403);
  if(!a.owner&&await hasProtectedHolder(b.serverId,b.roleId,u.id,a.rank))return asJson("Cargo atribuído a você ou a um membro de hierarquia superior.",403);
  const p=fields(b);if(!p)return asJson("Dados inválidos.");
  if(!canCreate(a,p))return asJson("Você não pode criar permissões ou hierarquia superiores às suas.",403);
  await db("UPDATE v3_roles SET name=$1,color=$2,priority=$3,manage_channels=$4,manage_messages=$5,moderate_members=$6,manage_roles=$7 WHERE id=$8 AND server_id=$9",[p.name,p.color,p.rank,p.rights.channels,p.rights.messages,p.rights.moderation,p.rights.roles,b.roleId,b.serverId]);
  return json({ok:true});
 }catch(e){if(String(e).includes("23505"))return asJson("Já existe cargo com esse nome.",409);return asJson("Não foi possível alterar o cargo.",503);}
}
export async function DELETE(request:Request){
 const fail=mutation(request,"roles",12);if(fail)return fail;
 try{
  const u=await getUser();if(!u)return asJson("Entre na conta.",401);
  const b=await request.json() as Record<string,unknown>;
  if(!isUuid(b.serverId)||!isUuid(b.roleId))return asJson("Servidor ou cargo inválido.");
  const a=await actorFor(b.serverId,u.id);if(!a)return asJson("Sem permissão.",403);
  const r=await roleFor(b.serverId,b.roleId);if(!r)return asJson("Cargo não encontrado.",404);
  if(!canEdit(a,r)||(!a.owner&&!within(rightSet(r),a.rights)))return asJson("Cargo fora da sua hierarquia.",403);
  if(!a.owner&&await hasProtectedHolder(b.serverId,b.roleId,u.id,a.rank))return asJson("Não é possível excluir um cargo atribuído a um membro de hierarquia igual ou superior.",403);
  await db("DELETE FROM v3_roles WHERE id=$1 AND server_id=$2",[b.roleId,b.serverId]);
  return await reportRoleVoiceCleanup(b.serverId);
 }catch{return asJson("Não foi possível excluir o cargo.",503);}
}
