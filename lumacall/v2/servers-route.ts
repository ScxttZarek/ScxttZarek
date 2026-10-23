import { randomBytes } from "node:crypto";
import { db } from "./database";
import { getUser, asJson, verifyOrigin } from "./auth";
import { allowRequest, requestIp } from "@/lib/rate-limit";
export const runtime="nodejs";
export async function GET(){
  try{
    const user=await getUser();if(!user)return asJson("Entre na conta.",401);
    const servers=await db("SELECT s.id,s.name,s.invite_code,s.member_count,m.role FROM v2_servers s JOIN v2_memberships m ON m.server_id=s.id WHERE m.user_id=$1 ORDER BY m.joined_at DESC",[user.id]);
    return Response.json({servers},{headers:{"cache-control":"no-store"}});
  }catch{return asJson("Não foi possível carregar seus servidores.",503);}
}
export async function POST(request:Request){
  if(!verifyOrigin(request))return asJson("Origem inválida.",403);
  if(!allowRequest("v2-server:"+requestIp(request.headers),15,60_000))return asJson("Muitas tentativas.",429);
  try{
    const user=await getUser();if(!user)return asJson("Entre na conta.",401);
    const body=await request.json() as {name?:unknown};
    const name=typeof body.name==="string"?body.name.trim().replace(/\s+/g," "):"";
    if(name.length<3||name.length>45)return asJson("O servidor precisa de 3 a 45 caracteres.");
    for(let k=0;k<3;k++){
      const invite=randomBytes(6).toString("hex").toUpperCase();
      try{
        const out=await db<{id:string}>("INSERT INTO v2_servers (name,invite_code,owner_id) VALUES($1,$2,$3) RETURNING id",[name,invite,user.id]);
        return Response.json({id:out[0].id,invite});
      }catch(e){if(!String(e).includes("23505"))throw e;}
    }
    return asJson("Não foi possível gerar um convite.",503);
  }catch(e){console.error("v2 create server",e instanceof Error?e.message:"error");return asJson("Não foi possível criar o servidor.",503);}
}
