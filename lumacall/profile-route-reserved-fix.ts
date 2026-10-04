import { NextResponse } from "next/server";
import { bearerSession } from "@/lib/livekit/app-session";
import { getRoomService } from "@/lib/livekit/server";
import { allowRequest, requestIp } from "@/lib/rate-limit";
import { displayNameSchema } from "@/lib/validation";
import { reservedIdentityForName, verifyReservedNameProof } from "@/lib/reserved-name-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ip = requestIp(request.headers);
    if (!allowRequest(`profile:${ip}`, 20, 60_000)) {
      return NextResponse.json({ error: "Muitas alterações em sequência. Tente novamente em instantes." }, { status: 429 });
    }

    const session = bearerSession(request.headers);
    if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

    const raw = await request.json();
    const parsed = displayNameSchema.safeParse(raw?.displayName);
    if (!parsed.success) return NextResponse.json({ error: "Nome inválido." }, { status: 400 });

    const reserved = reservedIdentityForName(parsed.data);
    const verifiedReserved = reserved ? verifyReservedNameProof(raw?.reservedNameProof, parsed.data) : null;
    if (reserved && !verifiedReserved) {
      return NextResponse.json(
        { error: "Este nome é reservado. Digite o código de acesso.", reservedNameRequired: true },
        { status: 403 },
      );
    }

    const displayName = verifiedReserved?.canonicalName ?? parsed.data;
    const service = getRoomService();
    const participants = await service.listParticipants(session.roomId);
    const participant = participants.find((item) => item.identity === session.identity);
    if (!participant) {
      return NextResponse.json({ error: "Você não está conectado à sala." }, { status: 409 });
    }

    let metadata: Record<string, unknown> = {};
    try {
      const parsedMetadata = JSON.parse(participant.metadata || "{}");
      if (parsedMetadata && typeof parsedMetadata === "object") metadata = parsedMetadata;
    } catch {}

    delete metadata.badge;
    if (verifiedReserved?.badge) metadata.badge = verifiedReserved.badge;

    await service.updateParticipant(session.roomId, session.identity, {
      name: displayName,
      metadata: JSON.stringify(metadata),
    });

    return NextResponse.json({ ok: true, displayName, badge: verifiedReserved?.badge ?? null });
  } catch (error) {
    console.error("Falha ao alterar nome", error);
    return NextResponse.json({ error: "Não foi possível alterar o nome agora." }, { status: 500 });
  }
}
