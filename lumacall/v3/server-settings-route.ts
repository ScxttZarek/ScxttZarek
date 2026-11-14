import { randomBytes } from "node:crypto";
import { db,getUser,asJson,isUuid,textValue,mutation,member,json } from "@/lib/v3/community";
export const runtime="nodejs";
export async function PATCH(request:Request){
 const fail=mutation(request,"server-settings",18);if(fail)return fail;
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const b=await request.json() as Record<string,unknown>;
  if(!isUuid(b.serverId)||((await member(b.serverId,user.id))?.role!=="owner"))return asJson("Somente o dono pode editar o servidor.",403);
  if(b.name!==undefined){
   const name=textValue(b.name,45);if(name.length<3||name.length>45)return asJson("Nome precisa ter entre 3 e 45 caracteres.");
   await db("UPDATE v2_servers SET name=$1 WHERE id=$2",[name,b.serverId]);
  }
  if(b.icon!==undefined){
   if(b.icon===null)await db("UPDATE v2_servers SET icon_data_url=NULL WHERE id=$1",[b.serverId]);
   else {
    const value=b.icon;
    if(typeof value!=="string"||value.length>170000||!/^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/.test(value))return asJson("Envie um ícone WEBP válido.");
    const bytes=Buffer.from(value.split(",")[1],"base64");
    if(bytes.length>120*1024||bytes.toString("ascii",0,4)!=="RIFF"||bytes.toString("ascii",8,12)!=="WEBP")return asJson("Ícone inválido ou muito grande.");
    await db("UPDATE v2_servers SET icon_data_url=$1 WHERE id=$2",[value,b.serverId]);
   }
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
