import { NextResponse } from "next/server";
import { getRoomService } from "@/lib/livekit/server";
import { isValidRoomId } from "@/lib/utils";
import { allowRequest, requestIp } from "@/lib/rate-limit";

export const runtime="nodejs";
export async function GET(request:Request) {
  const roomId=new URL(request.url).searchParams.get("roomId")?.trim().toUpperCase()||"";
  if(!isValidRoomId(roomId))return NextResponse.json({error:"Sala inválida."},{status:400});
  const ip=requestIp(request.headers);
  if(!allowRequest("call-presence:"+ip,35,60000))return NextResponse.json({error:"Aguarde um instante."},{status:429});
  try{
    const members=await getRoomService().listParticipants(roomId);
    return NextResponse.json({members:members.map(participant=>{
      let badge:string|undefined;
      try{const metadata=JSON.parse(participant.metadata||"{}") as {badge?:unknown};if(typeof metadata.badge==="string")badge=metadata.badge;}catch{}
      return {name:participant.name||"Participante",badge};
    })},{headers:{"cache-control":"no-store"}});
  }catch{
    return NextResponse.json({members:[]},{headers:{"cache-control":"no-store"}});
  }
}
