import { db,getUser,asJson,isUuid,mutation,json } from "@/lib/v3/community";
export const runtime="nodejs";
export async function GET(){
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const blocked=await db("SELECT u.id,u.name FROM v3_blocks b JOIN v2_users u ON u.id=b.blocked_id WHERE b.blocker_id=$1 ORDER BY b.created_at DESC",[user.id]);
  return json({blocked});
 }catch{return asJson("Não foi possível carregar bloqueios.",503);}
}
export async function POST(request:Request){
 const fail=mutation(request,"block",24);if(fail)return fail;
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const b=await request.json() as Record<string,unknown>;
  if(!isUuid(b.userId)||b.userId===user.id)return asJson("Usuário inválido.");
  const valid=await db("SELECT 1 FROM v2_users WHERE id=$1",[b.userId]);if(!valid.length)return asJson("Usuário não encontrado.",404);
  await db("INSERT INTO v3_blocks(blocker_id,blocked_id) VALUES($1,$2) ON CONFLICT DO NOTHING",[user.id,b.userId]);
  return json({ok:true});
 }catch{return asJson("Não foi possível bloquear o usuário.",503);}
}
export async function DELETE(request:Request){
 const fail=mutation(request,"block",24);if(fail)return fail;
 try{
  const user=await getUser();if(!user)return asJson("Entre na conta.",401);
  const b=await request.json() as Record<string,unknown>;
  if(!isUuid(b.userId))return asJson("Usuário inválido.");
  await db("DELETE FROM v3_blocks WHERE blocker_id=$1 AND blocked_id=$2",[user.id,b.userId]);
  return json({ok:true});
 }catch{return asJson("Não foi possível desbloquear o usuário.",503);}
}
