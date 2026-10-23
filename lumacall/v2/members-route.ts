import { db } from "./database";
import { getUser,asJson } from "./auth";
export async function GET(request:Request){
  try{
    const user=await getUser();if(!user)return asJson("Entre na conta.",401);
    const serverId=new URL(request.url).searchParams.get("serverId");
    if(!serverId||!/^[a-f\d-]{36}$/i.test(serverId))return asJson("Servidor inválido.");
    const rows=await db("SELECT u.id,u.name,u.badge,u.avatar_data_url,m.role FROM v2_memberships m JOIN v2_users u ON u.id=m.user_id WHERE m.server_id=$1 AND EXISTS(SELECT 1 FROM v2_memberships x WHERE x.server_id=m.server_id AND x.user_id=$2) ORDER BY (m.role='owner') DESC,m.joined_at ASC",[serverId,user.id]);
    return Response.json({members:rows},{headers:{"cache-control":"no-store"}});
  }catch{return asJson("Não foi possível carregar os membros.",503);}
}
