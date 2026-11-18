import { db,getUser,asJson,isUuid,textValue,mutation,member,permission,json } from "@/lib/v3/community";
import { getRoomService } from "@/lib/livekit/server";
export const runtime="nodejs";
// Revoking a private voice-channel grant must also affect an existing call.
// We check the *current* effective permission, not merely role membership,
// because a user may retain access through a different authorized role.
async function removeUnauthorizedVoiceParticipants(channelId:string,serverId:string,roleId:string){
 const roomName="v3-"+channelId,client=getRoomService();
 const active=await client.listRooms([roomName]);
 if(!active.some(room=>room.name===roomName))return {disconnected:true,removedParticipants:0,failedRemovals:0};
 const participants=await client.listParticipants(roomName);
 // Include former grantees who have left, to revoke their cached tokens.
 const former=await db<{identity:string}>(
  "SELECT user_id::text AS identity FROM v3_member_roles WHERE server_id=$1 AND role_id=$2",
  [serverId,roleId]
 );
 const identities=[...new Set([...participants.map(p=>p.identity),...former.map(p=>p.identity)])];
 const decisions=await Promise.all(identities.map(async identity=>{
  if(!isUuid(identity))return {identity,allowed:false};
  const access=await db<{allowed:boolean}>(
   "SELECT v3_can_read_channel($1::uuid,$2::uuid) AS allowed",
   [channelId,identity]
  );
  return {identity,allowed:access[0]?.allowed===true};
 }));
 const revoked=decisions.filter(p=>!p.allowed);
 if(!revoked.length)return {disconnected:true,removedParticipants:0,failedRemovals:0};
 const revokeTokenTs=BigInt(Math.floor(Date.now()/1000)+30);
 const results=await Promise.allSettled(
  revoked.map(p=>client.removeParticipant(roomName,p.identity,{revokeTokenTs}))
 );
 const failedRemovals=results.filter(r=>r.status==="rejected").length;
 if(failedRemovals)console.error("LumaCall channel grant disconnection incomplete",{
  channelId,failedRemovals,attempted:results.length
 });
 return {disconnected:failedRemovals===0,removedParticipants:results.length-failedRemovals,failedRemovals};
}

export async function GET(request:Request){
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const serverId=new URL(request.url).searchParams.get("serverId");
  if(!isUuid(serverId)||!(await member(serverId,user.id)))return asJson("Servidor indisponível.",403);
  const channels=await db("SELECT id,server_id,name,kind,position,is_private,category_id FROM v3_channels WHERE server_id=$1 AND archived_at IS NULL AND v3_can_read_channel(id,$2::uuid) ORDER BY CASE WHEN kind='text' THEN 0 ELSE 1 END,position,created_at",[serverId,user.id]);
  const canManage=await permission(serverId,user.id,"channels");
  const grants=canManage?await db("SELECT g.channel_id,g.role_id FROM v3_channel_grants g JOIN v3_channels c ON c.id=g.channel_id WHERE c.server_id=$1",[serverId]):[];
  return json({channels,canManage,grants});
 }catch{return asJson("Não foi possível carregar os canais.",503);}
}
export async function POST(request:Request){
 const denied=mutation(request,"channels",18);if(denied)return denied;
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const body=await request.json() as Record<string,unknown>;
  if(!isUuid(body.serverId))return asJson("Servidor inválido.");
  if(!(await permission(body.serverId,user.id,"channels")))return asJson("Sem permissão para gerenciar canais.",403);
  const name=textValue(body.name,32),kind=body.kind;
  if(!/^[\p{L}\p{N}_ -]{1,32}$/u.test(name)||!["text","voice"].includes(String(kind)))return asJson("Nome ou tipo de canal inválido.");
  const count=await db<{n:number}>("SELECT count(*)::int AS n FROM v3_channels WHERE server_id=$1 AND archived_at IS NULL",[body.serverId]);
  if(count[0]?.n>=60)return asJson("Limite de 60 canais por servidor.",409);
  if(body.categoryId!==undefined&&body.categoryId!==null){
   if(!isUuid(body.categoryId))return asJson("Categoria inválida.");
   const category=await db("SELECT 1 FROM v3_categories WHERE id=$1 AND server_id=$2",[body.categoryId,body.serverId]);
   if(!category.length)return asJson("Categoria não pertence a este servidor.",400);
  }
  const position=(await db<{next:number}>("SELECT coalesce(max(position)+1,0)::int AS next FROM v3_channels WHERE server_id=$1 AND kind=$2 AND archived_at IS NULL",[body.serverId,kind]))[0]?.next||0;
  const result=await db("INSERT INTO v3_channels(server_id,name,kind,position,is_private,category_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,name,kind,position,is_private,category_id",[body.serverId,name,kind,position,body.isPrivate===true,body.categoryId===undefined?null:body.categoryId]);
  return json({channel:result[0]});
 }catch(e){if(String(e).includes("23505")||String(e).toLowerCase().includes("duplicate"))return asJson("Já existe um canal com esse nome.",409);return asJson("Não foi possível criar o canal.",503);}
}
export async function PATCH(request:Request){
 const denied=mutation(request,"channels",30);if(denied)return denied;
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const b=await request.json() as Record<string,unknown>;
  if(!isUuid(b.channelId))return asJson("Canal inválido.");
  const existing=await db<{server_id:string;kind:string;name:string;category_id:string|null;is_private:boolean}>("SELECT server_id,kind,name,category_id,is_private FROM v3_channels WHERE id=$1 AND archived_at IS NULL",[b.channelId]);
  const c=existing[0];if(!c)return asJson("Canal não encontrado.",404);
  if(!(await permission(c.server_id,user.id,"channels")))return asJson("Sem permissão.",403);
  if(b.action==="grant"){
   if(!isUuid(b.roleId)||typeof b.enabled!=="boolean")return asJson("Permissão inválida.");
   const role=await db("SELECT 1 FROM v3_roles WHERE id=$1 AND server_id=$2",[b.roleId,c.server_id]);
   if(!role.length)return asJson("Cargo não pertence a este servidor.",400);
   if(b.enabled)await db("INSERT INTO v3_channel_grants(channel_id,role_id) VALUES($1,$2) ON CONFLICT DO NOTHING",[b.channelId,b.roleId]);
   else await db("DELETE FROM v3_channel_grants WHERE channel_id=$1 AND role_id=$2",[b.channelId,b.roleId]);
   if(c.kind==="voice"&&!b.enabled){
    // The grant change already committed. A LiveKit failure must be visible
    // to moderators, not silently misrepresented as an immediate revocation.
    try{
     const result=await removeUnauthorizedVoiceParticipants(b.channelId,c.server_id,b.roleId);
     if(!result.disconnected)return json({ok:true,...result,warning:"Cargo atualizado, mas alguns participantes não puderam ser desconectados da chamada. Verifique a sala."});
     return json({ok:true,...result});
    }catch{
     console.error("LumaCall channel grant call cleanup unverified",{channelId:b.channelId});
     return json({ok:true,disconnected:false,warning:"Cargo atualizado, mas a desconexão dos participantes da chamada não pôde ser confirmada."});
    }
   }
   return json({ok:true});
  }
  if(b.categoryId!==undefined&&b.categoryId!==null){
   if(!isUuid(b.categoryId))return asJson("Categoria inválida.");
   const category=await db("SELECT 1 FROM v3_categories WHERE id=$1 AND server_id=$2",[b.categoryId,c.server_id]);
   if(!category.length)return asJson("Categoria não pertence a este servidor.",400);
  }
  // Privacy is irreversible for a channel: even a currently empty private
  // channel might receive messages between a history check and an UPDATE.
  // Create a separate public channel instead of declassifying its identity.
  if(c.is_private&&b.isPrivate===false){
   return asJson("Este canal foi privado. Crie um novo canal público para preservar a privacidade.",409);
  }
  const nextCategory=b.categoryId===undefined?c.category_id:b.categoryId;
  const name=b.name===undefined?c.name:textValue(b.name,32);
  if(!/^[\p{L}\p{N}_ -]{1,32}$/u.test(name))return asJson("Nome inválido.");
  const position=Number.isInteger(b.position)&&Number(b.position)>=0&&Number(b.position)<1000?Number(b.position):null;
  // Repeat the irreversible privacy rule inside the UPDATE itself. A second
  // admin can privatize the channel after the first SELECT above.
  const updated=await db("UPDATE v3_channels SET name=$1,is_private=coalesce($2,is_private),position=coalesce($3,position),category_id=$5 WHERE id=$4 AND archived_at IS NULL AND (NOT is_private OR coalesce($2::boolean,true)) RETURNING id,name,kind,position,is_private,category_id",[name,typeof b.isPrivate==="boolean"?b.isPrivate:null,position,b.channelId,nextCategory]);
  if(!updated[0])return asJson("O canal foi arquivado ou tornou-se privado durante a edição. Atualize os canais.",409);
  return json({channel:updated[0]});
 }catch(e){if(String(e).includes("23505"))return asJson("Já existe um canal com esse nome.",409);return asJson("Não foi possível atualizar o canal.",503);}
}
export async function DELETE(request:Request){
 const denied=mutation(request,"channels",12);if(denied)return denied;
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const b=await request.json() as Record<string,unknown>;
  if(!isUuid(b.channelId))return asJson("Canal inválido.");
  const found=await db<{server_id:string;kind:string;name:string}>("SELECT server_id,kind,name FROM v3_channels WHERE id=$1 AND archived_at IS NULL",[b.channelId]);
  const c=found[0];if(!c)return asJson("Canal não encontrado.",404);
  if(!(await permission(c.server_id,user.id,"channels")))return asJson("Sem permissão.",403);
  if(c.kind==="text"&&c.name==="geral")return asJson("O canal geral não pode ser excluído.",409);
  const n=await db<{n:number}>("SELECT count(*)::int AS n FROM v3_channels WHERE server_id=$1 AND kind=$2 AND archived_at IS NULL",[c.server_id,c.kind]);
  if((n[0]?.n||0)<2)return asJson("É necessário manter pelo menos um canal de cada tipo.",409);
  // Soft-archive rather than delete: the historical channel ID and its privacy
  // grants remain intact. Message contents must NEVER be rehomed to #geral.
  // Rename the archived row to release its original name in the unique index.
  const archived=await db(
   "UPDATE v3_channels SET archived_at=now(),archived_name=name,name='arquivado-'||substr(replace(id::text,'-',''),1,20) WHERE id=$1 AND archived_at IS NULL RETURNING id",
   [b.channelId]
  );
  if(!archived.length)return asJson("O canal já foi arquivado.",409);
  if(c.kind==="voice"){
   // Archiving denies new tokens but does not disconnect existing LiveKit
   // participants. Close an active room immediately, without touching chat.
   // Previously issued tokens may still be valid until their short TTL ends.
   const roomName="v3-"+b.channelId;
   try{
    const client=getRoomService();
    const rooms=await client.listRooms([roomName]);
    if(rooms.some(room=>room.name===roomName))await client.deleteRoom(roomName);
   }catch{
    // The DB archive already committed. Don't retry it or report complete
    // disconnection if the external service could not be reached.
    console.error("LumaCall archived voice room could not be closed",{channelId:b.channelId});
    return json({ok:true,archived:true,disconnected:false,warning:"Canal arquivado, mas não foi possível confirmar o encerramento da chamada. Verifique a sala."});
   }
   return json({ok:true,archived:true,disconnected:true});
  }
  return json({ok:true,archived:true});
 }catch{return asJson("Não foi possível excluir o canal.",503);}
}
