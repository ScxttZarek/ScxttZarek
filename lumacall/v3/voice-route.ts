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
  const rows=await db<{server_id:string}>("SELECT server_id FROM v3_channels WHERE id=$1 AND kind='voice' AND v3_can_read_channel(id,$2::uuid)",[b.channelId,user.id]);
  if(!rows[0])return asJson("Sem acesso a este canal de voz.",403);
  const key=process.env.LIVEKIT_API_KEY,secret=process.env.LIVEKIT_API_SECRET;
  if(!key||!secret)return asJson("Chamada indisponível.",503);
  const roomName="v3-"+b.channelId;
  try{await getRoomService().createRoom({name:roomName,maxParticipants:6,emptyTimeout:120});}
  catch(e){const existing=await getRoomService().listRooms([roomName]);if(!existing.length)throw e;}
  const token=new AccessToken(key,secret,{identity:user.id,name:user.name,ttl:"2h",metadata:JSON.stringify({badge:user.badge})});
  token.addGrant({roomJoin:true,room:roomName,canPublish:true,canSubscribe:true,canPublishData:true});
  return json({token:await token.toJwt(),serverUrl:getLiveKitWsUrl(),serverId:rows[0].server_id});
 }catch{return asJson("Não foi possível entrar neste canal de voz.",503);}
}
