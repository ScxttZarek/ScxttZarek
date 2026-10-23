import { db } from "./database";
import { getUser, normalizedName, asJson, verifyOrigin } from "./auth";
export const runtime="nodejs";
export async function PATCH(request:Request){
  if(!verifyOrigin(request))return asJson("Origem inválida.",403);
  try{
    const user=await getUser();if(!user)return asJson("Entre na sua conta.",401);
    const body=await request.json() as {name?:unknown;avatar?:unknown};
    if(Object.prototype.hasOwnProperty.call(body,"name")){
      const n=normalizedName(body.name);if(!n)return asJson("Nome inválido.");
      // A restrição restante é a unicidade global no índice name_key do banco.
      try {await db("UPDATE v2_users SET name=$1,name_key=$2 WHERE id=$3",[n.name,n.key,user.id]);}
      catch(e){if(String(e).includes("23505")||String(e).toLowerCase().includes("duplicate"))return asJson("Este nome já está sendo usado.",409);throw e;}
    }
    if(Object.prototype.hasOwnProperty.call(body,"avatar")){
      if(body.avatar===null){await db("UPDATE v2_users SET avatar_data_url=NULL WHERE id=$1",[user.id]);}
      else {
        const value=body.avatar;
        if(typeof value!=="string"||value.length>170000||!/^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/.test(value))return asJson("Use uma foto WEBP de até 120 KB.");
        const bytes=Buffer.from(value.split(",")[1],"base64");
        if(bytes.length>120*1024||bytes.toString("ascii",0,4)!=="RIFF"||bytes.toString("ascii",8,12)!=="WEBP")return asJson("Arquivo de foto inválido.");
        await db("UPDATE v2_users SET avatar_data_url=$1 WHERE id=$2",[value,user.id]);
      }
    }
    const fresh=await getUser();return Response.json({user:fresh});
  }catch{return asJson("Não foi possível salvar o perfil.",503);}
}
