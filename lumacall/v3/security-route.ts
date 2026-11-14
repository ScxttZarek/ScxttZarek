import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/v2/database";
import { getUser,verifySecret,secretHash,asJson,verifyOrigin,COOKIE_NAME } from "@/lib/v2/auth";
import { allowRequest,requestIp } from "@/lib/rate-limit";
export const runtime="nodejs";
export async function POST(request:Request){
 if(!verifyOrigin(request))return asJson("Origem inválida.",403);
 if(!allowRequest("v3-security:"+requestIp(request.headers),8,60_000))return asJson("Muitas tentativas.",429);
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const b=await request.json() as Record<string,unknown>;
  if(b.action!=="change-secret"||typeof b.current!=="string"||typeof b.next!=="string"||b.next.length<8||b.next.length>200)return asJson("O novo código deve ter no mínimo 8 caracteres.");
  const rows=await db<{secret_hash:string}>("SELECT secret_hash FROM v2_users WHERE id=$1",[user.id]);
  if(!rows[0]||!(await verifySecret(b.current,rows[0].secret_hash)))return asJson("Código atual incorreto.",401);
  const nextHash=await secretHash(b.next);
  await db("UPDATE v2_users SET secret_hash=$1 WHERE id=$2",[nextHash,user.id]);
  const currentToken=(await cookies()).get(COOKIE_NAME)?.value;
  const sessionHash=currentToken?createHash("sha256").update(currentToken).digest("hex"):"";
  await db("DELETE FROM v2_sessions WHERE user_id=$1 AND token_hash<>$2",[user.id,sessionHash]);
  return Response.json({ok:true});
 }catch{return asJson("Não foi possível alterar o código secreto.",503);}
}
