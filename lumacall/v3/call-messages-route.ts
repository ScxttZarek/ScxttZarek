import { db,getUser,asJson,isUuid,mutation,member,json } from "@/lib/v3/community";
export const runtime="nodejs";
export async function GET(request:Request){
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const params=new URL(request.url).searchParams;
  const channelId=params.get("channelId"),before=params.get("before");
  if(!isUuid(channelId))return asJson("Canal inválido.");
  if(before!==null&&(!/^\\d{1,19}$/.test(before)||BigInt(before)>BigInt("9223372036854775807")||BigInt(before)<1n))return asJson("Cursor inválido.");
  const allowed=await db("SELECT 1 FROM v3_channels WHERE id=$1 AND kind='voice' AND archived_at IS NULL AND v3_can_read_channel(id,$2::uuid)",[channelId,user.id]);
  if(!allowed.length)return asJson("Sem acesso a esta chamada.",403);
  // Keyset pages are scoped to this voice channel and re-check access in SQL.
  const raw=await db<{id:string;content:string;created_at:string;user_id:string;name:string;badge:string|null;avatar_data_url:string|null}>(
   "SELECT m.id::text AS id,m.content,m.created_at,u.id AS user_id,u.name,u.badge,u.avatar_data_url "+
   "FROM (SELECT * FROM v3_call_messages WHERE channel_id=$1 AND ($2::bigint IS NULL OR id<$2::bigint) "+
   "AND EXISTS(SELECT 1 FROM v3_channels c WHERE c.id=v3_call_messages.channel_id AND c.kind='voice' AND c.archived_at IS NULL AND v3_can_read_channel(c.id,$3::uuid)) "+
   "ORDER BY id DESC LIMIT 101) m JOIN v2_users u ON u.id=m.user_id ORDER BY m.id ASC",
   [channelId,before,user.id]
  );
  const hasMore=raw.length>100,messages=hasMore?raw.slice(1):raw;
  return json({messages,nextCursor:hasMore?messages[0]?.id:null});
 }catch{return asJson("Não foi possível carregar o chat da chamada.",503);}
}
export async function POST(request:Request){
 const fail=mutation(request,"call-chat",45);if(fail)return fail;
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const b=await request.json() as Record<string,unknown>;
  if(!isUuid(b.channelId)||typeof b.content!=="string")return asJson("Canal inválido.");
  const content=b.content.trim();if(!content||content.length>2000)return asJson("Mensagem precisa ter entre 1 e 2000 caracteres.");
  // Membership, archival and voice-channel privacy are checked during INSERT.
  const rows=await db<{id:string}>(
   "INSERT INTO v3_call_messages(server_id,channel_id,user_id,content) "+
   "SELECT c.server_id,c.id,$2::uuid,$3::text FROM v3_channels c "+
   "WHERE c.id=$1::uuid AND c.kind='voice' AND c.archived_at IS NULL "+
   "AND v3_can_read_channel(c.id,$2::uuid) RETURNING id::text",
   [b.channelId,user.id,content]
  );
  if(!rows[0])return asJson("Sem acesso a esta chamada.",403);
  return json({ok:true,id:rows[0].id});
 }catch{return asJson("Não foi possível enviar no chat da chamada.",503);}
}
