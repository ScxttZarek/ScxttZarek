import { db,getUser,asJson,isUuid,mutation,member,json } from "@/lib/v3/community";
export const runtime="nodejs";
export async function GET(request:Request){
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const channelId=new URL(request.url).searchParams.get("channelId");
  if(!isUuid(channelId))return asJson("Canal inválido.");
  const allowed=await db("SELECT 1 FROM v3_channels WHERE id=$1 AND kind='voice' AND v3_can_read_channel(id,$2::uuid)",[channelId,user.id]);
  if(!allowed.length)return asJson("Sem acesso a esta chamada.",403);
  const messages=await db("SELECT m.id::text AS id,m.content,m.created_at,u.id AS user_id,u.name,u.badge,u.avatar_data_url FROM (SELECT * FROM v3_call_messages WHERE channel_id=$1 ORDER BY id DESC LIMIT 100) m JOIN v2_users u ON u.id=m.user_id ORDER BY m.id ASC",[channelId]);
  return json({messages});
 }catch{return asJson("Não foi possível carregar o chat da chamada.",503);}
}
export async function POST(request:Request){
 const fail=mutation(request,"call-chat",45);if(fail)return fail;
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const b=await request.json() as Record<string,unknown>;
  if(!isUuid(b.channelId)||typeof b.content!=="string")return asJson("Canal inválido.");
  const voice=await db<{server_id:string}>("SELECT server_id FROM v3_channels WHERE id=$1 AND kind='voice' AND v3_can_read_channel(id,$2::uuid)",[b.channelId,user.id]);
  if(!voice[0])return asJson("Sem acesso a esta chamada.",403);
  const content=b.content.trim();if(!content||content.length>2000)return asJson("Mensagem precisa ter entre 1 e 2000 caracteres.");
  const rows=await db("INSERT INTO v3_call_messages(server_id,channel_id,user_id,content) VALUES($1,$2,$3,$4) RETURNING id",[voice[0].server_id,b.channelId,user.id,content]);
  return json({ok:true,id:rows[0]});
 }catch{return asJson("Não foi possível enviar no chat da chamada.",503);}
}
