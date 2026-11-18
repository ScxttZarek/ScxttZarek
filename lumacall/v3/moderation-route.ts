import { db,getUser,asJson,isUuid,textValue,mutation,member,permission,json } from "@/lib/v3/community";
import { getRoomService } from "@/lib/livekit/server";
export const runtime="nodejs";

// Remove a kicked/banned identity from every currently active voice channel.
// Database membership removal is authoritative; a LiveKit failure is reported
// explicitly, never misrepresented as a complete disconnection.
async function disconnectFromServerCalls(serverId:string,userId:string){
 const channels=await db<{id:string}>(
  "SELECT id FROM v3_channels WHERE server_id=$1 AND kind='voice'",[serverId]
 );
 const rooms=["v2-"+serverId,...channels.map(c=>"v3-"+c.id)];
 if(!rooms.length)return {disconnected:true,failedRooms:0};
 const client=getRoomService();
 const active=await client.listRooms(rooms);
 const names=active.map(room=>room.name);
 if(!names.length)return {disconnected:true,failedRooms:0};
 const revokeTokenTs=BigInt(Math.floor(Date.now()/1000)+30);
 const results=await Promise.allSettled(
  names.map(name=>client.removeParticipant(name,userId,{revokeTokenTs}))
 );
 const failedRooms=results.filter(r=>r.status==="rejected").length;
 if(failedRooms)console.error("LumaCall call removal failed",{
  serverId,failedRooms,attempted:results.length
 });
 return {disconnected:failedRooms===0,failedRooms};
}

export async function GET(request:Request){
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const serverId=new URL(request.url).searchParams.get("serverId");
  if(!isUuid(serverId)||!(await permission(serverId,user.id,"moderation")))return asJson("Sem permissão.",403);
  const bans=await db("SELECT b.user_id,u.name,b.reason,b.created_at FROM v3_bans b JOIN v2_users u ON u.id=b.user_id WHERE b.server_id=$1 ORDER BY b.created_at DESC",[serverId]);
  return json({bans});
 }catch{return asJson("Não foi possível carregar moderação.",503);}
}
export async function POST(request:Request){
 const fail=mutation(request,"moderation",20);if(fail)return fail;
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const b=await request.json() as Record<string,unknown>;
  if(!isUuid(b.serverId)||!isUuid(b.userId)||!["kick","ban","unban"].includes(String(b.action)))return asJson("Ação inválida.");
  if(!(await permission(b.serverId,user.id,"moderation")))return asJson("Sem permissão de moderação.",403);
  if(b.userId===user.id)return asJson("Não é possível moderar sua própria conta.",409);
  const actor=await member(b.serverId,user.id);
  if(!actor)return asJson("Você não é membro do servidor.",403);
  if(b.action==="unban"){
   await db("DELETE FROM v3_bans WHERE server_id=$1 AND user_id=$2",[b.serverId,b.userId]);
   return json({ok:true});
  }
  const target=await member(b.serverId,b.userId);
  if(!target)return asJson("Usuário não pertence ao servidor.",404);
  if(target.role==="owner")return asJson("O dono do servidor não pode ser removido.",403);
  if(actor.role!=="owner"){
   const ranks=await db<{id:string;rank:number}>("SELECT mr.user_id AS id,coalesce(max(r.priority),-1)::int AS rank FROM v3_member_roles mr JOIN v3_roles r ON r.id=mr.role_id WHERE mr.server_id=$1 AND mr.user_id IN ($2,$3) GROUP BY mr.user_id",[b.serverId,user.id,b.userId]);
   const ownRank=ranks.find(x=>x.id===user.id)?.rank??-1,targetRank=ranks.find(x=>x.id===b.userId)?.rank??-1;
   if(targetRank>=ownRank)return asJson("Você não pode moderar alguém de cargo igual ou superior.",403);
  }
  if(b.action==="ban"){
   await db("WITH banned AS (INSERT INTO v3_bans(server_id,user_id,banned_by,reason) VALUES($1,$2,$3,$4) ON CONFLICT(server_id,user_id) DO UPDATE SET banned_by=EXCLUDED.banned_by,reason=EXCLUDED.reason RETURNING user_id),removed AS (DELETE FROM v2_memberships WHERE server_id=$1 AND user_id=$2 AND EXISTS(SELECT 1 FROM banned) RETURNING user_id) UPDATE v2_servers SET member_count=greatest(1,member_count-(SELECT count(*) FROM removed)) WHERE id=$1",[b.serverId,b.userId,user.id,textValue(b.reason,300)]);
  }else{
   await db("WITH removed AS (DELETE FROM v2_memberships WHERE server_id=$1 AND user_id=$2 RETURNING user_id) UPDATE v2_servers SET member_count=greatest(1,member_count-(SELECT count(*) FROM removed)) WHERE id=$1",[b.serverId,b.userId]);
  }
  try{
   const callResult=await disconnectFromServerCalls(b.serverId,b.userId);
   return json({ok:true,...callResult});
  }catch{
   // Moderation database action has already committed. Never lie about
   // the call result or retry the database mutation blindly.
   console.error("LumaCall voice disconnect could not be verified",{serverId:b.serverId});
   return json({ok:true,disconnected:false,warning:"A remoção do servidor foi concluída, mas não foi possível confirmar a desconexão da chamada. Verifique a sala."});
  }
 }catch{return asJson("Não foi possível moderar o membro.",503);}
}
