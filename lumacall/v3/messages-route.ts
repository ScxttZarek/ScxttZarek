import { db,getUser,asJson,isUuid,mutation,permission,json } from "@/lib/v3/community";
export const runtime="nodejs";
async function readable(channelId:string,userId:string){
 const rows=await db<{server_id:string;ok:boolean}>("SELECT server_id,v3_can_read_channel(id,$2::uuid) AS ok FROM v3_channels WHERE id=$1 AND kind='text'",[channelId,userId]);
 return rows[0]?.ok===true?rows[0]:null;
}
export async function GET(request:Request){
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const params=new URL(request.url).searchParams;
  const id=params.get("channelId"),before=params.get("before");
  if(!isUuid(id)||!(await readable(id,user.id)))return asJson("Sem acesso a este canal.",403);
  if(before!==null&&(!/^\d{1,19}$/.test(before)||BigInt(before)>BigInt("9223372036854775807")))return asJson("Cursor de histórico inválido.");
  // Keyset paging preserves ordering under concurrent writes.
  const raw=await db<{id:string;content:string;created_at:string;edited_at:string|null;deleted_at:string|null;user_id:string;name:string;badge:string|null;avatar_data_url:string|null}>(
   "SELECT m.id::text AS id,m.content,m.created_at,m.edited_at,m.deleted_at,u.id AS user_id,u.name,u.badge,u.avatar_data_url "+
   "FROM (SELECT x.* FROM v2_messages x WHERE x.channel_id=$1 AND ($2::bigint IS NULL OR x.id<$2::bigint) ORDER BY x.id DESC LIMIT 101) m "+
   "JOIN v2_users u ON u.id=m.user_id ORDER BY m.id ASC",[id,before]
  );
  const hasMore=raw.length>100,messages=hasMore?raw.slice(1):raw;
  const first=messages[0]?.id,last=messages[messages.length-1]?.id;
  const reactions=first&&last?await db(
   "SELECT r.message_id::text AS message_id,r.emoji,r.user_id FROM v3_reactions r "+
   "JOIN v2_messages m ON m.id=r.message_id "+
   "WHERE m.channel_id=$1 AND r.message_id BETWEEN $2::bigint AND $3::bigint "+
   "ORDER BY r.message_id DESC LIMIT 5000",[id,first,last]
  ):[];
  return json({messages,reactions,nextCursor:hasMore?first:null});
 }catch{return asJson("Não foi possível carregar as mensagens.",503);}
}
export async function POST(request:Request){
 const fail=mutation(request,"messages",65);if(fail)return fail;
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const b=await request.json() as Record<string,unknown>;
  if(b.action==="reaction"){
   const id=typeof b.messageId==="string"&&/^\d+$/.test(b.messageId)?b.messageId:null;
   const emoji=typeof b.emoji==="string"?b.emoji:"";
   if(!id||!["👍","❤️","😂","😮","😢","🔥","👀","🎉"].includes(emoji))return asJson("Reação inválida.");
   const m=await db<{channel_id:string}>("SELECT channel_id FROM v2_messages WHERE id=$1 AND deleted_at IS NULL",[id]);
   if(!m[0]||!(await readable(m[0].channel_id,user.id)))return asJson("Mensagem indisponível.",403);
   const old=await db("SELECT 1 FROM v3_reactions WHERE message_id=$1 AND user_id=$2 AND emoji=$3",[id,user.id,emoji]);
   if(old.length)await db("DELETE FROM v3_reactions WHERE message_id=$1 AND user_id=$2 AND emoji=$3",[id,user.id,emoji]);
   else await db("INSERT INTO v3_reactions(message_id,user_id,emoji) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",[id,user.id,emoji]);
   return json({ok:true,selected:old.length===0});
  }
  if(!isUuid(b.channelId)||typeof b.content!=="string")return asJson("Canal ou mensagem inválidos.");
  const content=b.content.trim();
  if(content.length<1||content.length>2000)return asJson("Mensagem precisa ter entre 1 e 2000 caracteres.");
  const c=await readable(b.channelId,user.id);if(!c)return asJson("Sem permissão para enviar neste canal.",403);
  const rows=await db<{id:string}>("INSERT INTO v2_messages(server_id,channel_id,user_id,content) VALUES($1,$2,$3,$4) RETURNING id::text",[c.server_id,b.channelId,user.id,content]);
  return json({ok:true,id:rows[0].id});
 }catch{return asJson("Não foi possível enviar a mensagem.",503);}
}
export async function PATCH(request:Request){
 const fail=mutation(request,"message-edit",30);if(fail)return fail;
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const b=await request.json() as Record<string,unknown>;
  if(typeof b.id!=="string"||!/^\d+$/.test(b.id)||typeof b.content!=="string")return asJson("Mensagem inválida.");
  const content=b.content.trim();if(!content||content.length>2000)return asJson("Mensagem inválida.");
  const existing=await db<{channel_id:string;user_id:string;deleted_at:string|null}>("SELECT channel_id,user_id,deleted_at FROM v2_messages WHERE id=$1",[b.id]);
  if(!existing[0]||existing[0].deleted_at)return asJson("Mensagem não encontrada.",404);
  if(existing[0].user_id!==user.id)return asJson("Você só pode editar suas mensagens.",403);
  if(!(await readable(existing[0].channel_id,user.id)))return asJson("Sem acesso ao canal.",403);
  await db("UPDATE v2_messages SET content=$1,edited_at=now() WHERE id=$2 AND user_id=$3 AND deleted_at IS NULL",[content,b.id,user.id]);
  return json({ok:true});
 }catch{return asJson("Não foi possível editar a mensagem.",503);}
}
export async function DELETE(request:Request){
 const fail=mutation(request,"message-delete",30);if(fail)return fail;
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const b=await request.json() as Record<string,unknown>;
  if(typeof b.id!=="string"||!/^\d+$/.test(b.id))return asJson("Mensagem inválida.");
  const existing=await db<{channel_id:string;server_id:string;user_id:string}>("SELECT channel_id,server_id,user_id FROM v2_messages WHERE id=$1",[b.id]);
  const m=existing[0];if(!m)return asJson("Mensagem não encontrada.",404);
  if(!(await readable(m.channel_id,user.id)))return asJson("Sem acesso.",403);
  if(m.user_id!==user.id&&!(await permission(m.server_id,user.id,"messages")))return asJson("Sem permissão para excluir mensagens de outras pessoas.",403);
  await db("UPDATE v2_messages SET content='Mensagem excluída',deleted_at=now() WHERE id=$1 AND deleted_at IS NULL",[b.id]);
  return json({ok:true});
 }catch{return asJson("Não foi possível excluir a mensagem.",503);}
}
