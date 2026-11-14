import { db,getUser,asJson,isUuid,textValue,mutation,member,json } from "@/lib/v3/community";
export const runtime="nodejs";
async function owner(serverId:string,userId:string){
 const role=await member(serverId,userId);return role?.role==="owner";
}
export async function GET(request:Request){
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const serverId=new URL(request.url).searchParams.get("serverId");
  if(!isUuid(serverId)||!(await member(serverId,user.id)))return asJson("Servidor indisponível.",403);
  const [roles,assignments]=await Promise.all([
   db("SELECT id,server_id,name,color,priority,manage_channels,manage_messages,moderate_members,manage_roles FROM v3_roles WHERE server_id=$1 ORDER BY priority DESC,name",[serverId]),
   db("SELECT mr.user_id,mr.role_id FROM v3_member_roles mr JOIN v3_roles r ON r.id=mr.role_id WHERE mr.server_id=$1 AND r.server_id=$1",[serverId])
  ]);
  return json({roles,assignments,canManage:await owner(serverId,user.id)});
 }catch{return asJson("Não foi possível carregar os cargos.",503);}
}
export async function POST(request:Request){
 const fail=mutation(request,"roles",12);if(fail)return fail;
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const b=await request.json() as Record<string,unknown>;
  if(!isUuid(b.serverId)||!(await owner(b.serverId,user.id)))return asJson("Somente o dono pode criar cargos.",403);
  const name=textValue(b.name,32);
  const color=typeof b.color==="string"?b.color:"#aaaaaa";
  if(name.length<2||!/^[\p{L}\p{N}_ -]{2,32}$/u.test(name)||!/^#[\da-f]{6}$/i.test(color))return asJson("Nome ou cor inválidos.");
  const n=await db<{count:number}>("SELECT count(*)::int AS count FROM v3_roles WHERE server_id=$1",[b.serverId]);
  if(n[0]?.count>=25)return asJson("Limite de 25 cargos por servidor.",409);
  const permissions=Object(b.permissions)||{};
  const r=await db("INSERT INTO v3_roles(server_id,name,color,priority,manage_channels,manage_messages,moderate_members,manage_roles) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id",[b.serverId,name,color,Math.max(0,Math.min(100,Math.trunc(Number(b.priority)||0))),permissions.channels===true,permissions.messages===true,permissions.moderation===true,permissions.roles===true]);
  return json({role:r[0]});
 }catch(e){if(String(e).includes("23505"))return asJson("Cargo já existente.",409);return asJson("Não foi possível criar o cargo.",503);}
}
export async function PATCH(request:Request){
 const fail=mutation(request,"roles",36);if(fail)return fail;
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const b=await request.json() as Record<string,unknown>;
  if(!isUuid(b.serverId)||!(await owner(b.serverId,user.id)))return asJson("Somente o dono pode gerenciar cargos.",403);
  if(b.action==="assign"||b.action==="unassign"){
   if(!isUuid(b.userId)||!isUuid(b.roleId))return asJson("Membro ou cargo inválido.");
   const role=await db("SELECT 1 FROM v3_roles WHERE server_id=$1 AND id=$2",[b.serverId,b.roleId]);
   const target=await member(b.serverId,b.userId);
   if(!role.length||!target)return asJson("Cargo ou membro não encontrado.",404);
   if(b.action==="assign")await db("INSERT INTO v3_member_roles(server_id,user_id,role_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",[b.serverId,b.userId,b.roleId]);
   else await db("DELETE FROM v3_member_roles WHERE server_id=$1 AND user_id=$2 AND role_id=$3",[b.serverId,b.userId,b.roleId]);
   return json({ok:true});
  }
  if(!isUuid(b.roleId))return asJson("Cargo inválido.");
  const role=await db("SELECT 1 FROM v3_roles WHERE id=$1 AND server_id=$2",[b.roleId,b.serverId]);
  if(!role.length)return asJson("Cargo não encontrado.",404);
  const name=textValue(b.name,32);
  const color=typeof b.color==="string"?b.color:"#aaaaaa";
  if(!/^[\p{L}\p{N}_ -]{2,32}$/u.test(name)||!/^#[\da-f]{6}$/i.test(color))return asJson("Dados inválidos.");
  const permissions=Object(b.permissions)||{};
  await db("UPDATE v3_roles SET name=$1,color=$2,priority=$3,manage_channels=$4,manage_messages=$5,moderate_members=$6,manage_roles=$7 WHERE id=$8 AND server_id=$9",
   [name,color,Math.max(0,Math.min(100,Math.trunc(Number(b.priority)||0))),permissions.channels===true,permissions.messages===true,permissions.moderation===true,permissions.roles===true,b.roleId,b.serverId]);
  return json({ok:true});
 }catch(e){if(String(e).includes("23505"))return asJson("Já existe um cargo com esse nome.",409);return asJson("Não foi possível alterar o cargo.",503);}
}
export async function DELETE(request:Request){
 const fail=mutation(request,"roles",12);if(fail)return fail;
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const b=await request.json() as Record<string,unknown>;
  if(!isUuid(b.serverId)||!isUuid(b.roleId)||!(await owner(b.serverId,user.id)))return asJson("Sem permissão.",403);
  await db("DELETE FROM v3_roles WHERE id=$1 AND server_id=$2",[b.roleId,b.serverId]);
  return json({ok:true});
 }catch{return asJson("Não foi possível excluir o cargo.",503);}
}
