import { db,getUser,asJson,isUuid,textValue,mutation,member,permission,json } from "@/lib/v3/community";
export const runtime="nodejs";
export async function GET(request:Request){
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const serverId=new URL(request.url).searchParams.get("serverId");
  if(!isUuid(serverId)||!(await member(serverId,user.id)))return asJson("Sem acesso ao servidor.",403);
  const categories=await db("SELECT id,server_id,name,position FROM v3_categories WHERE server_id=$1 ORDER BY position,name",[serverId]);
  return json({categories});
 }catch{return asJson("Não foi possível carregar categorias.",503);}
}
export async function POST(request:Request){
 const fail=mutation(request,"categories",20);if(fail)return fail;
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const b=await request.json() as Record<string,unknown>;
  if(!isUuid(b.serverId)||!(await permission(b.serverId,user.id,"channels")))return asJson("Sem permissão.",403);
  const name=textValue(b.name,32);if(!/^[\p{L}\p{N}_ -]{2,32}$/u.test(name))return asJson("Nome inválido.");
  const n=await db<{n:number}>("SELECT count(*)::int AS n FROM v3_categories WHERE server_id=$1",[b.serverId]);
  if((n[0]?.n||0)>=20)return asJson("Limite de 20 categorias.",409);
  const rows=await db("INSERT INTO v3_categories(server_id,name,position) VALUES($1,$2,(SELECT coalesce(max(position)+1,0) FROM v3_categories WHERE server_id=$1)) RETURNING id",[b.serverId,name]);
  return json({category:rows[0]});
 }catch(e){if(String(e).includes("23505"))return asJson("Categoria já existente.",409);return asJson("Não foi possível criar categoria.",503);}
}
export async function PATCH(request:Request){
 const fail=mutation(request,"categories",25);if(fail)return fail;
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const b=await request.json() as Record<string,unknown>;
  if(!isUuid(b.categoryId))return asJson("Categoria inválida.");
  const found=await db<{server_id:string}>("SELECT server_id FROM v3_categories WHERE id=$1",[b.categoryId]);
  if(!found[0]||!(await permission(found[0].server_id,user.id,"channels")))return asJson("Sem permissão.",403);
  const name=textValue(b.name,32);if(!/^[\p{L}\p{N}_ -]{2,32}$/u.test(name))return asJson("Nome inválido.");
  const pos=Number.isInteger(b.position)&&Number(b.position)>=0&&Number(b.position)<1000?Number(b.position):null;
  await db("UPDATE v3_categories SET name=$1,position=coalesce($2,position) WHERE id=$3",[name,pos,b.categoryId]);
  return json({ok:true});
 }catch(e){if(String(e).includes("23505"))return asJson("Categoria já existente.",409);return asJson("Não foi possível editar categoria.",503);}
}
export async function DELETE(request:Request){
 const fail=mutation(request,"categories",12);if(fail)return fail;
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const b=await request.json() as Record<string,unknown>;
  if(!isUuid(b.categoryId))return asJson("Categoria inválida.");
  const found=await db<{server_id:string}>("SELECT server_id FROM v3_categories WHERE id=$1",[b.categoryId]);
  if(!found[0]||!(await permission(found[0].server_id,user.id,"channels")))return asJson("Sem permissão.",403);
  await db("DELETE FROM v3_categories WHERE id=$1",[b.categoryId]);
  return json({ok:true});
 }catch{return asJson("Não foi possível excluir categoria.",503);}
}
