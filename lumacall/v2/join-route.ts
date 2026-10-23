import { db } from "./database";
import { getUser,asJson,verifyOrigin } from "./auth";
import { allowRequest, requestIp } from "@/lib/rate-limit";
export async function POST(request:Request){
  if(!verifyOrigin(request))return asJson("Origem inválida.",403);
  if(!allowRequest("v2-join:"+requestIp(request.headers),15,60_000))return asJson("Muitas tentativas.",429);
  try{
    const user=await getUser();if(!user)return asJson("Entre na conta.",401);
    const {code}=await request.json() as {code?:unknown};
    if(typeof code!=="string"||!/^([a-f0-9]{12})$/i.test(code.trim()))return asJson("Código de convite inválido.");
    const row=await db<{result:string}>("SELECT v2_join_server($1,$2::uuid) AS result",[code,user.id]);
    const result=row[0]?.result||"NOT_FOUND";
    if(result==="FULL")return asJson("Servidor lotado: máximo de 6 pessoas.",409);
    if(result==="NOT_FOUND")return asJson("Convite não encontrado.",404);
    if(result==="ALREADY_MEMBER"){
      const server=await db<{id:string}>("SELECT s.id FROM v2_servers s JOIN v2_memberships m ON m.server_id=s.id WHERE s.invite_code=$1 AND m.user_id=$2",[code.toUpperCase(),user.id]);
      return Response.json({id:server[0]?.id,alreadyJoined:true});
    }
    return Response.json({id:result});
  }catch(e){console.error("v2 join",e instanceof Error?e.message:"error");return asJson("Não foi possível entrar no servidor.",503);}
}
