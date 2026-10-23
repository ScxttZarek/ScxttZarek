import { cookies } from "next/headers";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { db } from "./database";
const scrypt = promisify(scryptCallback);
export const COOKIE_NAME = "lc_v2_session";
export type User = {id:string; name:string; name_key:string; avatar_data_url:string|null; badge:string|null};
export function normalizedName(v:unknown) {
  if(typeof v!=="string") return null;
  const name=v.normalize("NFKC").trim().replace(/\s+/g," ");
  if(name.length<3 || name.length>24 || !/^[\p{L}\p{N}_. -]+$/u.test(name))return null;
  return {name,key:name.toLocaleLowerCase("pt-BR")};
}
export async function secretHash(secret:string,salt=randomBytes(16).toString("hex")) {
  const out=await scrypt(secret,salt,64) as Buffer;
  return "scrypt:"+salt+":"+out.toString("hex");
}
export async function verifySecret(secret:string,stored:string) {
  const [,salt,encoded]=stored.split(":");
  if(!salt||!encoded||!stored.startsWith("scrypt:"))return false;
  const provided=await scrypt(secret,salt,64) as Buffer;
  const saved=Buffer.from(encoded,"hex");
  return saved.length===provided.length && timingSafeEqual(saved,provided);
}
export async function setSession(userId:string) {
  const token=randomBytes(32).toString("base64url");
  const hash=createHash("sha256").update(token).digest("hex");
  await db("INSERT INTO v2_sessions (token_hash,user_id,expires_at) VALUES ($1,$2,now()+interval '30 days')",[hash,userId]);
  (await cookies()).set(COOKIE_NAME,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*24*30});
}
export async function clearSession() {
  const store=await cookies();const token=store.get(COOKIE_NAME)?.value;
  if(token)await db("DELETE FROM v2_sessions WHERE token_hash=$1",[createHash("sha256").update(token).digest("hex")]);
  store.delete(COOKIE_NAME);
}
export async function getUser():Promise<User|null>{
  const token=(await cookies()).get(COOKIE_NAME)?.value;
  if(!token) return null;
  const hash=createHash("sha256").update(token).digest("hex");
  const rows=await db<User>("SELECT u.id,u.name,u.name_key,u.avatar_data_url,u.badge FROM v2_sessions s JOIN v2_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() LIMIT 1",[hash]);
  return rows[0]||null;
}
export function verifyOrigin(request:Request) {
  const origin=request.headers.get("origin");
  if(!origin)return false;
  try {return new URL(origin).host===new URL(request.url).host;} catch {return false;}
}
export function asJson(error:string,status=400) {
  return Response.json({error},{status,headers:{"cache-control":"no-store"}});
}
