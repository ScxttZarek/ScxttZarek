import { db,getUser,asJson,isUuid,mutation,json } from "@/lib/v3/community";
export const runtime="nodejs";
async function threadFor(threadId:string,userId:string){
 const rows=await db<{user_a:string;user_b:string}>("SELECT user_a,user_b FROM v3_dm_threads WHERE id=$1 AND (user_a=$2 OR user_b=$2)",[threadId,userId]);
 return rows[0]||null;
}
async function blocked(a:string,b:string){
 const rows=await db("SELECT 1 FROM v3_blocks WHERE (blocker_id=$1 AND blocked_id=$2) OR (blocker_id=$2 AND blocked_id=$1) LIMIT 1",[a,b]);
 return rows.length>0;
}
export async function GET(request:Request){
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const threadId=new URL(request.url).searchParams.get("threadId");
  if(threadId){
   if(!isUuid(threadId)||!(await threadFor(threadId,user.id)))return asJson("Conversa não encontrada.",404);
   const messages=await db("SELECT m.id::text AS id,m.content,m.created_at,m.edited_at,m.user_id,u.name,u.avatar_data_url FROM (SELECT * FROM v3_dm_messages WHERE thread_id=$1 ORDER BY id DESC LIMIT 100) m JOIN v2_users u ON u.id=m.user_id ORDER BY m.id ASC",[threadId]);
   return json({messages});
  }
  const threads=await db("SELECT t.id,t.created_at,u.id AS peer_id,u.name,u.avatar_data_url,u.presence, (SELECT content FROM v3_dm_messages x WHERE x.thread_id=t.id ORDER BY id DESC LIMIT 1) AS last_message FROM v3_dm_threads t JOIN v2_users u ON u.id=CASE WHEN t.user_a=$1 THEN t.user_b ELSE t.user_a END WHERE t.user_a=$1 OR t.user_b=$1 ORDER BY coalesce((SELECT max(created_at) FROM v3_dm_messages WHERE thread_id=t.id),t.created_at) DESC LIMIT 80",[user.id]);
  return json({threads});
 }catch{return asJson("Não foi possível carregar as mensagens privadas.",503);}
}
export async function POST(request:Request){
 const fail=mutation(request,"dm",45);if(fail)return fail;
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const b=await request.json() as Record<string,unknown>;
  if(b.action==="open"){
   if(!isUuid(b.peerId)||b.peerId===user.id)return asJson("Usuário inválido.");
   if(await blocked(user.id,b.peerId))return asJson("Conversa indisponível.",403);
   const shared=await db("SELECT 1 FROM v2_memberships x JOIN v2_memberships y ON y.server_id=x.server_id AND y.user_id=$2 WHERE x.user_id=$1 LIMIT 1",[user.id,b.peerId]);
   if(!shared.length)return asJson("Só é possível conversar com membros de um servidor em comum.",403);
   const a=user.id<b.peerId?user.id:b.peerId,z=user.id<b.peerId?b.peerId:user.id;
   const rows=await db<{id:string}>("INSERT INTO v3_dm_threads(user_a,user_b) VALUES($1,$2) ON CONFLICT(user_a,user_b) DO UPDATE SET user_a=EXCLUDED.user_a RETURNING id",[a,z]);
   return json({threadId:rows[0].id});
  }
  if(!isUuid(b.threadId)||typeof b.content!=="string")return asJson("Conversa ou mensagem inválidas.");
  const thread=await threadFor(b.threadId,user.id);if(!thread)return asJson("Sem acesso.",403);
  const peer=thread.user_a===user.id?thread.user_b:thread.user_a;
  if(await blocked(user.id,peer))return asJson("Conversa indisponível.",403);
  const content=b.content.trim();if(!content||content.length>2000)return asJson("Mensagem precisa ter entre 1 e 2000 caracteres.");
  const rows=await db("INSERT INTO v3_dm_messages(thread_id,user_id,content) VALUES($1,$2,$3) RETURNING id",[b.threadId,user.id,content]);
  return json({ok:true,id:rows[0]});
 }catch{return asJson("Não foi possível enviar a mensagem privada.",503);}
}
