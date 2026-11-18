import { db } from "./database";
import { getUser, normalizedName, asJson, verifyOrigin } from "./auth";
export const runtime="nodejs";

// Validate the entire PATCH first, then apply all user-facing changes in a
// single atomic UPDATE. Never save a name only to reject the accompanying bio.
export async function PATCH(request:Request){
 if(!verifyOrigin(request))return asJson("Origem inválida.",403);
 try{
  const user=await getUser();if(!user)return asJson("Entre na sua conta.",401);
  const body=await request.json() as Record<string,unknown>;
  if(!body||typeof body!=="object"||Array.isArray(body))return asJson("Dados inválidos.");
  const assignments:string[]=[];
  const params:unknown[]=[];
  function set(field:"name"|"name_key"|"avatar_data_url"|"bio"|"presence",value:unknown){
   params.push(value);assignments.push(field+"=$"+params.length);
  }
  if(Object.prototype.hasOwnProperty.call(body,"name")){
   const name=normalizedName(body.name);if(!name)return asJson("Nome inválido.");
   set("name",name.name);set("name_key",name.key);
  }
  if(Object.prototype.hasOwnProperty.call(body,"avatar")){
   if(body.avatar===null)set("avatar_data_url",null);
   else {
    const value=body.avatar;
    if(typeof value!=="string"||value.length>170000||!/^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/.test(value))return asJson("Use uma foto WEBP de até 120 KB.");
    const bytes=Buffer.from(value.split(",")[1],"base64");
    if(bytes.length>120*1024||bytes.toString("ascii",0,4)!=="RIFF"||bytes.toString("ascii",8,12)!=="WEBP")return asJson("Arquivo de foto inválido.");
    set("avatar_data_url",value);
   }
  }
  if(Object.prototype.hasOwnProperty.call(body,"bio")){
   if(typeof body.bio!=="string"||body.bio.length>180)return asJson("A biografia deve ter até 180 caracteres.");
   set("bio",body.bio.trim());
  }
  if(Object.prototype.hasOwnProperty.call(body,"presence")){
   if(!["online","idle","dnd","invisible"].includes(String(body.presence)))return asJson("Status inválido.");
   set("presence",body.presence);
  }
  if(assignments.length){
   params.push(user.id);
   try{await db("UPDATE v2_users SET "+assignments.join(",")+" WHERE id=$"+params.length,params);}
   catch(e){
    if(String(e).includes("23505")||String(e).toLowerCase().includes("duplicate"))return asJson("Este nome já está sendo usado.",409);
    throw e;
   }
  }
  return Response.json({user:await getUser()});
 }catch{return asJson("Não foi possível salvar o perfil.",503);}
}
