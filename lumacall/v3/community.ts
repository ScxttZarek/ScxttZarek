import { db } from "@/lib/v2/database";
import { getUser, asJson, verifyOrigin } from "@/lib/v2/auth";
import { allowRequest, requestIp } from "@/lib/rate-limit";
export { db, getUser, asJson };
export const isUuid=(v:unknown):v is string=>typeof v==="string"&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(v);
export function textValue(v:unknown,max:number){return typeof v==="string"?v.trim().replace(/\s+/g," ").slice(0,max+1):"";}
export function mutation(request:Request,key:string,limit=30):Response|null{
 if(!verifyOrigin(request))return asJson("Origem inválida.",403);
 if(!allowRequest("v3:"+key+":"+requestIp(request.headers),limit,60_000))return asJson("Muitas tentativas. Aguarde um momento.",429);
 return null;
}
export async function member(serverId:string,userId:string){
 const rows=await db<{role:string}>("SELECT role FROM v2_memberships WHERE server_id=$1 AND user_id=$2 LIMIT 1",[serverId,userId]);
 return rows[0]||null;
}
export async function permission(serverId:string,userId:string,what:"channels"|"roles"|"messages"|"moderation"){
 const rows=await db<{ok:boolean}>("SELECT v3_user_permission($1::uuid,$2::uuid,$3::text) AS ok",[serverId,userId,what]);
 return rows[0]?.ok===true;
}
export const json=(body:unknown)=>Response.json(body,{headers:{"cache-control":"no-store"}});
