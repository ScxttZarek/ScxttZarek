import { AccessToken } from "livekit-server-sdk";
import { getLiveKitWsUrl,getRoomService } from "@/lib/livekit/server";
import { db,getUser,asJson,isUuid,mutation,json } from "@/lib/v3/community";
export const runtime="nodejs";
export async function POST(request:Request){
 const fail=mutation(request,"voice",24);if(fail)return fail;
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const b=await request.json() as Record<string,unknown>;
  if(!isUuid(b.channelId))return asJson("Canal inválido.");
  const rows=await db<{server_id:string}>("SELECT server_id FROM v3_channels WHERE id=$1 AND kind='voice' AND archived_at IS NULL AND v3_can_read_channel(id,$2::uuid)",[b.channelId,user.id]);
  if(!rows[0])return asJson("Sem acesso a este canal de voz.",403);
  const key=process.env.LIVEKIT_API_KEY,secret=process.env.LIVEKIT_API_SECRET;
  if(!key||!secret)return asJson("Chamada indisponível.",503);
  const roomName="v3-"+b.channelId;
  try{await getRoomService().createRoom({name:roomName,maxParticipants:6,emptyTimeout:120});}
  catch(e){const existing=await getRoomService().listRooms([roomName]);if(!existing.length)throw e;}
  // Creating or finding the LiveKit room may take time; authorization can be
  // revoked during that network request. Verify again before signing a token.
  const stillAllowed=await db<{server_id:string}>(
   "SELECT server_id FROM v3_channels WHERE id=$1 AND kind='voice' AND archived_at IS NULL AND v3_can_read_channel(id,$2::uuid)",
   [b.channelId,user.id]
  );
  if(!stillAllowed[0]||stillAllowed[0].server_id!==rows[0].server_id)
   return asJson("Seu acesso a este canal mudou. Entre novamente.",403);
  const token=new AccessToken(key,secret,{identity:user.id,name:user.name,ttl:"10m",metadata:JSON.stringify({badge:user.badge})});
  token.addGrant({roomJoin:true,room:roomName,canPublish:true,canSubscribe:true,canPublishData:true});
  return json({token:await token.toJwt(),serverUrl:getLiveKitWsUrl(),serverId:rows[0].server_id});
 }catch{return asJson("Não foi possível entrar neste canal de voz.",503);}
}
