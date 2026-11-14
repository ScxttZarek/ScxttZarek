import { db,getUser,asJson,isUuid,mutation,member,json } from "@/lib/v3/community";
export const runtime="nodejs";
export async function GET(request:Request){
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const serverId=new URL(request.url).searchParams.get("serverId");
  if(!isUuid(serverId)||!(await member(serverId,user.id)))return asJson("Sem acesso à chamada.",403);
  const messages=await db("SELECT m.id::text AS id,m.content,m.created_at,u.id AS user_id,u.name,u.badge,u.avatar_data_url FROM (SELECT * FROM v3_call_messages WHERE server_id=$1 ORDER BY id DESC LIMIT 100) m JOIN v2_users u ON u.id=m.user_id ORDER BY m.id ASC",[serverId]);
  return json({messages});
 }catch{return asJson("Não foi possível carregar o chat da chamada.",503);}
}
export async function POST(request:Request){
 const fail=mutation(request,"call-chat",45);if(fail)return fail;
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const b=await request.json() as Record<string,unknown>;
  if(!isUuid(b.serverId)||typeof b.content!=="string"||!(await member(b.serverId,user.id)))return asJson("Sem acesso.",403);
  const content=b.content.trim();if(!content||content.length>2000)return asJson("Mensagem precisa ter entre 1 e 2000 caracteres.");
  const rows=await db("INSERT INTO v3_call_messages(server_id,user_id,content) VALUES($1,$2,$3) RETURNING id",[b.serverId,user.id,content]);
  return json({ok:true,id:rows[0]});
 }catch{return asJson("Não foi possível enviar no chat da chamada.",503);}
}
