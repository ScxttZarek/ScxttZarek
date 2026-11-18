import { getUser, asJson, verifyOrigin } from "./auth";
export const runtime="nodejs";
// This server-wide endpoint predates channel permissions. It must never mint a
// LiveKit token, even when an authenticated member attempts to call it directly.
export async function POST(request:Request){
 if(!verifyOrigin(request))return asJson("Origem inválida.",403);
 const user=await getUser();
 if(!user)return asJson("Entre na conta.",401);
 return asJson("Chamada antiga desativada. Atualize o LumaCall e entre pelo canal de voz.",410);
}
