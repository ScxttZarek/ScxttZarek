import { db,getUser,asJson,isUuid,textValue,mutation,member,permission,json } from "@/lib/v3/community";
export const runtime="nodejs";
export async function GET(request:Request){
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const serverId=new URL(request.url).searchParams.get("serverId");
  if(!isUuid(serverId)||!(await member(serverId,user.id)))return asJson("Servidor indisponível.",403);
  const channels=await db("SELECT id,server_id,name,kind,position,is_private FROM v3_channels WHERE server_id=$1 AND v3_can_read_channel(id,$2::uuid) ORDER BY CASE WHEN kind='text' THEN 0 ELSE 1 END,position,created_at",[serverId,user.id]);
  const canManage=await permission(serverId,user.id,"channels");
  return json({channels,canManage});
 }catch{return asJson("Não foi possível carregar os canais.",503);}
}
export async function POST(request:Request){
 const denied=mutation(request,"channels",18);if(denied)return denied;
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const body=await request.json() as Record<string,unknown>;
  if(!isUuid(body.serverId))return asJson("Servidor inválido.");
  if(!(await permission(body.serverId,user.id,"channels")))return asJson("Sem permissão para gerenciar canais.",403);
  const name=textValue(body.name,32),kind=body.kind;
  if(!/^[\p{L}\p{N}_ -]{1,32}$/u.test(name)||!["text","voice"].includes(String(kind)))return asJson("Nome ou tipo de canal inválido.");
  const count=await db<{n:number}>("SELECT count(*)::int AS n FROM v3_channels WHERE server_id=$1",[body.serverId]);
  if(count[0]?.n>=60)return asJson("Limite de 60 canais por servidor.",409);
  const position=(await db<{next:number}>("SELECT coalesce(max(position)+1,0)::int AS next FROM v3_channels WHERE server_id=$1 AND kind=$2",[body.serverId,kind]))[0]?.next||0;
  const result=await db("INSERT INTO v3_channels(server_id,name,kind,position,is_private) VALUES($1,$2,$3,$4,$5) RETURNING id,name,kind,position,is_private",[body.serverId,name,kind,position,body.isPrivate===true]);
  return json({channel:result[0]});
 }catch(e){if(String(e).includes("23505")||String(e).toLowerCase().includes("duplicate"))return asJson("Já existe um canal com esse nome.",409);return asJson("Não foi possível criar o canal.",503);}
}
export async function PATCH(request:Request){
 const denied=mutation(request,"channels",30);if(denied)return denied;
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const b=await request.json() as Record<string,unknown>;
  if(!isUuid(b.channelId))return asJson("Canal inválido.");
  const existing=await db<{server_id:string;kind:string;name:string}>("SELECT server_id,kind,name FROM v3_channels WHERE id=$1",[b.channelId]);
  const c=existing[0];if(!c)return asJson("Canal não encontrado.",404);
  if(!(await permission(c.server_id,user.id,"channels")))return asJson("Sem permissão.",403);
  const name=b.name===undefined?c.name:textValue(b.name,32);
  if(!/^[\p{L}\p{N}_ -]{1,32}$/u.test(name))return asJson("Nome inválido.");
  const position=Number.isInteger(b.position)&&Number(b.position)>=0&&Number(b.position)<1000?Number(b.position):null;
  const updated=await db("UPDATE v3_channels SET name=$1,is_private=coalesce($2,is_private),position=coalesce($3,position) WHERE id=$4 RETURNING id,name,kind,position,is_private",[name,typeof b.isPrivate==="boolean"?b.isPrivate:null,position,b.channelId]);
  return json({channel:updated[0]});
 }catch(e){if(String(e).includes("23505"))return asJson("Já existe um canal com esse nome.",409);return asJson("Não foi possível atualizar o canal.",503);}
}
export async function DELETE(request:Request){
 const denied=mutation(request,"channels",12);if(denied)return denied;
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const b=await request.json() as Record<string,unknown>;
  if(!isUuid(b.channelId))return asJson("Canal inválido.");
  const found=await db<{server_id:string;kind:string;name:string}>("SELECT server_id,kind,name FROM v3_channels WHERE id=$1",[b.channelId]);
  const c=found[0];if(!c)return asJson("Canal não encontrado.",404);
  if(!(await permission(c.server_id,user.id,"channels")))return asJson("Sem permissão.",403);
  if(c.kind==="text"&&c.name==="geral")return asJson("O canal geral não pode ser excluído.",409);
  const n=await db<{n:number}>("SELECT count(*)::int AS n FROM v3_channels WHERE server_id=$1 AND kind=$2",[c.server_id,c.kind]);
  if((n[0]?.n||0)<2)return asJson("É necessário manter pelo menos um canal de cada tipo.",409);
  await db("DELETE FROM v3_channels WHERE id=$1",[b.channelId]);
  await db("UPDATE v2_messages SET channel_id=(SELECT id FROM v3_channels WHERE server_id=$1 AND kind='text' AND name='geral' LIMIT 1) WHERE server_id=$1 AND channel_id IS NULL",[c.server_id]);
  return json({ok:true});
 }catch{return asJson("Não foi possível excluir o canal.",503);}
}
