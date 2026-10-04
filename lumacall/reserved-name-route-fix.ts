import { NextResponse } from "next/server";
import { allowRequest, requestIp } from "@/lib/rate-limit";
import {
  createReservedNameProof,
  reservedIdentityForName,
  verifyReservedAccessCode,
} from "@/lib/reserved-name-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ip = requestIp(request.headers);
    if (!allowRequest(`reserved-name:${ip}`, 12, 60_000)) {
      return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto e tente novamente." }, { status: 429 });
    }

    const raw = await request.json();
    const displayName = typeof raw?.displayName === "string" ? raw.displayName : "";
    const code = typeof raw?.code === "string" ? raw.code : "";

    const reserved = reservedIdentityForName(displayName);
    if (!reserved) {
      return NextResponse.json({ error: "Este nome não é reservado." }, { status: 400 });
    }

    const verified = verifyReservedAccessCode(displayName, code);
    if (!verified) {
      return NextResponse.json({ error: "Código incorreto." }, { status: 403 });
    }

    return NextResponse.json({
      ok: true,
      displayName: verified.canonicalName,
      badge: verified.badge,
      proof: createReservedNameProof(verified),
    });
  } catch (error) {
    console.error("Falha ao validar nome reservado", error);
    return NextResponse.json({ error: "Não foi possível validar este nome agora." }, { status: 500 });
  }
}
