import { randomBytes } from "node:crypto";
import { db,getUser,asJson,isUuid,textValue,mutation,member,json } from "@/lib/v3/community";
export const runtime="nodejs";
export async function PATCH(request:Request){
 const fail=mutation(request,"server-settings",18);if(fail)return fail;
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const b=await request.json() as Record<string,unknown>;
  if(!isUuid(b.serverId)||((await member(b.serverId,user.id))?.role!=="owner"))return asJson("Somente o dono pode editar o servidor.",403);
  // Validate *every* requested field before issuing a single database update.
  // This prevents a valid name from being saved when the accompanying icon fails.
  const updates:string[]=[],values:(string|null)[]=[];
  if(b.name!==undefined){
   const name=textValue(b.name,45);
   if(name.length<3||name.length>45)return asJson("Nome precisa ter entre 3 e 45 caracteres.");
   values.push(name);updates.push("name=$"+values.length);
  }
  if(b.icon!==undefined){
   let icon:string|null;
   if(b.icon===null)icon=null;
   else {
    const value=b.icon;
    if(typeof value!=="string"||value.length>170000||!/^data:image\\/webp;base64,[A-Za-z0-9+/]+=*$/.test(value))return asJson("Envie um ícone WEBP válido.");
    const bytes=Buffer.from(value.split(",")[1],"base64");
    if(bytes.length>120*1024||bytes.toString("ascii",0,4)!=="RIFF"||bytes.toString("ascii",8,12)!=="WEBP")return asJson("Ícone inválido ou muito grande.");
    icon=value;
   }
   values.push(icon);updates.push("icon_data_url=$"+values.length);
  }
  if(updates.length){
   // Recheck ownership in the same SQL statement that changes the row.
   const rows=await db<{id:string}>(
    "UPDATE v2_servers s SET "+updates.join(",")+" WHERE s.id=$"+(values.length+1)+"::uuid "+
    "AND EXISTS(SELECT 1 FROM v2_memberships m WHERE m.server_id=s.id AND m.user_id=$"+(values.length+2)+"::uuid AND m.role='owner') RETURNING s.id",
    [...values,b.serverId,user.id]
   );
   if(!rows.length)return asJson("Sem permissão para editar servidor.",403);
  }
  return json({ok:true});
 }catch{return asJson("Não foi possível atualizar o servidor.",503);}
}
export async function POST(request:Request){
 const fail=mutation(request,"invite-rotate",6);if(fail)return fail;
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const b=await request.json() as Record<string,unknown>;
  if(!isUuid(b.serverId)||((await member(b.serverId,user.id))?.role!=="owner"))return asJson("Somente o dono pode renovar o convite.",403);
  for(let i=0;i<4;i++){
   const invite=randomBytes(6).toString("hex").toUpperCase();
   try{
    await db("UPDATE v2_servers SET invite_code=$1 WHERE id=$2",[invite,b.serverId]);
    return json({ok:true,invite});
   }catch(e){if(!String(e).includes("23505"))throw e;}
  }
  return asJson("Não foi possível renovar o convite.",503);
 }catch{return asJson("Não foi possível renovar o convite.",503);}
}
