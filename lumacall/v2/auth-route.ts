import { db } from "./database";
import { getUser, setSession, clearSession, normalizedName, secretHash, verifySecret, verifyOrigin, asJson } from "./auth";
import { allowRequest, requestIp } from "@/lib/rate-limit";
export const runtime="nodejs";
export async function GET() {
  try { return Response.json({user:await getUser()},{headers:{"cache-control":"no-store"}}); }
  catch { return asJson("As contas ainda não estão disponíveis. O banco precisa ser configurado.",503); }
}
export async function POST(request:Request) {
  if(!verifyOrigin(request))return asJson("Origem inválida.",403);
  const ip=requestIp(request.headers);
  if(!allowRequest("v2-auth:"+ip,12,60_000))return asJson("Muitas tentativas. Tente novamente mais tarde.",429);
  try {
    const body=await request.json() as {action?:string;name?:unknown;secret?:unknown};
    const normalized=normalizedName(body.name);
    const secret=body.secret;
    if(!normalized || typeof secret!=="string"||secret.length<4||secret.length>200)return asJson("Use um nome de 3 a 24 caracteres e um código secreto de pelo menos 4 caracteres.");
    if(body.action==="register"){
      // A identidade é definida pelo primeiro cadastro: nenhum nome recebe privilégios por padrão.
      const password=await secretHash(secret);
      try{
        const rows=await db<{id:string}>("INSERT INTO v2_users (name,name_key,secret_hash) VALUES($1,$2,$3) RETURNING id",[normalized.name,normalized.key,password]);
        await setSession(rows[0].id);
        return Response.json({ok:true});
      }catch(e){
        if(String(e).includes("23505")||String(e).toLowerCase().includes("duplicate"))return asJson("Este nome já está sendo usado. Escolha outro.",409);
        throw e;
      }
    }
    if(body.action==="login"){
      const rows=await db<{id:string;secret_hash:string}>("SELECT id,secret_hash FROM v2_users WHERE name_key=$1 LIMIT 1",[normalized.key]);
      if(!rows[0]||!(await verifySecret(secret,rows[0].secret_hash)))return asJson("Nome ou código secreto incorreto.",401);
      await setSession(rows[0].id);
      return Response.json({ok:true});
    }
    return asJson("Ação inválida.");
  }catch(e){console.error("LumaCall V2 auth error:",e instanceof Error?e.message:"unknown");return asJson("Não foi possível processar o acesso.",503);}
}
export async function DELETE(request:Request) {
  if(!verifyOrigin(request))return asJson("Origem inválida.",403);
  try {await clearSession();return Response.json({ok:true});}catch{return asJson("Não foi possível sair.",503);}
}
