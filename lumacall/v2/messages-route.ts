import { db } from "./database";
import { getUser,asJson,verifyOrigin } from "./auth";
import { allowRequest,requestIp } from "@/lib/rate-limit";
export const runtime="nodejs";
export async function GET(request:Request){
  try{
    const user=await getUser();if(!user)return asJson("Entre na conta.",401);
    const id=new URL(request.url).searchParams.get("serverId");
    if(!id||!/^[a-f\d-]{36}$/i.test(id))return asJson("Servidor inválido.");
    const messages=await db("SELECT m.id::text AS id,m.content,m.created_at,u.id AS user_id,u.name,u.badge,u.avatar_data_url FROM (SELECT x.* FROM v2_messages x WHERE x.server_id=$1 AND EXISTS(SELECT 1 FROM v2_memberships z WHERE z.server_id=x.server_id AND z.user_id=$2) ORDER BY x.id DESC LIMIT 100) m JOIN v2_users u ON u.id=m.user_id ORDER BY m.id ASC",[id,user.id]);
    return Response.json({messages},{headers:{"cache-control":"no-store"}});
  }catch{return asJson("Não foi possível carregar mensagens.",503);}
}
export async function POST(request:Request){
  if(!verifyOrigin(request))return asJson("Origem inválida.",403);
  if(!allowRequest("v2-msg:"+requestIp(request.headers),50,60_000))return asJson("Envie mensagens com menos frequência.",429);
  try{
    const user=await getUser();if(!user)return asJson("Entre na conta.",401);
    const b=await request.json() as {serverId?:unknown;content?:unknown};
    if(typeof b.serverId!=="string"||!/^[a-f\d-]{36}$/i.test(b.serverId)||typeof b.content!=="string")return asJson("Mensagem inválida.");
    const content=b.content.trim();
    if(content.length<1||content.length>2000)return asJson("Mensagem precisa ter entre 1 e 2000 caracteres.");
    const inserted=await db<{id:string}>("INSERT INTO v2_messages(server_id,user_id,content) SELECT $1::uuid,$2::uuid,$3 WHERE EXISTS(SELECT 1 FROM v2_memberships WHERE server_id=$1::uuid AND user_id=$2::uuid) RETURNING id::text",[b.serverId,user.id,content]);
    if(!inserted.length)return asJson("Você não é membro deste servidor.",403);
    return Response.json({ok:true,id:inserted[0].id});
  }catch{return asJson("Não foi possível enviar a mensagem.",503);}
}
