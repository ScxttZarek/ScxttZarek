import { AccessToken } from "livekit-server-sdk";
import { db } from "./database";
import { getUser,asJson,verifyOrigin } from "./auth";
import { getLiveKitWsUrl,getRoomService } from "@/lib/livekit/server";
export const runtime="nodejs";
export async function POST(request:Request){
  if(!verifyOrigin(request))return asJson("Origem inválida.",403);
  try{
    const user=await getUser();if(!user)return asJson("Entre na conta.",401);
    const {serverId}=await request.json() as {serverId?:unknown};
    if(typeof serverId!=="string"||!/^[a-f\d-]{36}$/i.test(serverId))return asJson("Servidor inválido.");
    const has=await db("SELECT 1 FROM v2_memberships WHERE user_id=$1 AND server_id=$2 LIMIT 1",[user.id,serverId]);
    if(!has.length)return asJson("Você não é membro deste servidor.",403);
    const key=process.env.LIVEKIT_API_KEY,secret=process.env.LIVEKIT_API_SECRET;
    if(!key||!secret)return asJson("Chamada indisponível.",503);
    const roomName="v2-"+serverId;
    try{await getRoomService().createRoom({name:roomName,maxParticipants:6,emptyTimeout:120});}
    catch(e){const existing=await getRoomService().listRooms([roomName]);if(!existing.length)throw e;}
    const token=new AccessToken(key,secret,{identity:user.id,name:user.name,ttl:"2h",metadata:JSON.stringify({badge:user.badge})});
    token.addGrant({roomJoin:true,room:roomName,canPublish:true,canSubscribe:true,canPublishData:true});
    return Response.json({token:await token.toJwt(),serverUrl:getLiveKitWsUrl()});
  }catch{return asJson("Não foi possível entrar na chamada.",503);}
}
