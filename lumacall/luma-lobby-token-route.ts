import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { allowRequest, requestIp } from "@/lib/rate-limit";
import { isValidRoomId, sanitizeDisplayName } from "@/lib/utils";
import { getLiveKitWsUrl, getRoomService, parseRoomMetadata } from "@/lib/livekit/server";
import { reservedIdentityForName, verifyReservedNameProof } from "@/lib/reserved-name-server";

export const runtime = "nodejs";
const maxChatMembers = 50;

export async function POST(request: Request) {
  try {
    const ip = requestIp(request.headers);
    if (!allowRequest("lobby:" + ip, 25, 60_000)) {
      return NextResponse.json({error: "Aguarde antes de tentar novamente."},{status:429});
    }
    const body = await request.json() as {roomId?:string;displayName?:string;reservedNameProof?:string};
    const roomId = typeof body.roomId === "string" ? body.roomId.trim().toUpperCase() : "";
    const displayName = sanitizeDisplayName(typeof body.displayName === "string" ? body.displayName : "");
    if(!isValidRoomId(roomId) || displayName.length<2 || displayName.length>24) {
      return NextResponse.json({error:"Nome ou sala inválidos."},{status:400});
    }
    const reserved = reservedIdentityForName(displayName);
    const proof = reserved ? verifyReservedNameProof(body.reservedNameProof,displayName) : null;
    if(reserved && !proof) return NextResponse.json({error:"Este nome é reservado. Valide o código de acesso.",reservedNameRequired:true},{status:403});
    const display = proof?.canonicalName ?? displayName;
    const badge = proof?.badge;
    const service = getRoomService();
    const voiceRoom = (await service.listRooms([roomId]))[0];
    if(voiceRoom && parseRoomMetadata(voiceRoom.metadata).locked) {
      return NextResponse.json({error:"Esta sala está bloqueada."},{status:423});
    }
    const chatRoom = "lc-general-" + roomId;
    const existing = (await service.listRooms([chatRoom]))[0];
    if(!existing) {
      try {
        await service.createRoom({name:chatRoom,maxParticipants:maxChatMembers,emptyTimeout:30*60,departureTimeout:30});
      } catch {
        const raced = (await service.listRooms([chatRoom]))[0];
        if(!raced) throw new Error("Falha ao preparar canal geral");
      }
    }
    const key=process.env.LIVEKIT_API_KEY,secret=process.env.LIVEKIT_API_SECRET;
    if(!key || !secret)throw new Error("LiveKit não configurado");
    const token=new AccessToken(key,secret,{identity:randomUUID(),name:display,ttl:"2h",metadata:JSON.stringify({badge:badge??null,role:"lobby"})});
    token.addGrant({roomJoin:true,room:chatRoom,canPublish:false,canPublishData:true,canSubscribe:false});
    return NextResponse.json({token:await token.toJwt(),serverUrl:getLiveKitWsUrl(),displayName:display});
  } catch(error) {
    console.error("Falha ao preparar chat geral",error);
    return NextResponse.json({error:"Não foi possível conectar ao chat geral."},{status:500});
  }
}
