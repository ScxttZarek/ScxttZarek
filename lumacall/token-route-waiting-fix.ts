import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { MAX_PARTICIPANTS } from "@/lib/constants";
import { allowRequest, requestIp } from "@/lib/rate-limit";
import { createAppSession, verifyAppSession } from "@/lib/livekit/app-session";
import {
  createParticipantToken,
  ensureRoom,
  getLiveKitWsUrl,
  getRoomService,
  parseRoomMetadata,
} from "@/lib/livekit/server";
import {
  createWaitingRequest,
  pruneWaitingRequests,
  verifyWaitingToken,
} from "@/lib/livekit/waiting-room";
import { tokenRequestSchema } from "@/lib/validation";
import { reservedIdentityForName, verifyReservedNameProof } from "@/lib/reserved-name-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ip = requestIp(request.headers);
    if (!allowRequest("token:" + ip, 35, 60_000)) {
      return NextResponse.json({ error: "Muitas tentativas. Aguarde um instante e tente novamente." }, { status: 429 });
    }

    const parsed = tokenRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Nome ou código da sala inválido." }, { status: 400 });
    }

    const { roomId, displayName, resumeToken, reservedNameProof, waitingToken, cancelWaiting } = parsed.data;
    const reserved = reservedIdentityForName(displayName);
    const verifiedReserved = reserved ? verifyReservedNameProof(reservedNameProof, displayName) : null;

    if (reserved && !verifiedReserved) {
      return NextResponse.json(
        { error: "Este nome é reservado. Digite o código de acesso.", reservedNameRequired: true },
        { status: 403 },
      );
    }

    const safeDisplayName = verifiedReserved?.canonicalName ?? displayName;
    const badge = verifiedReserved?.badge;
    const waitingProof = verifyWaitingToken(waitingToken, roomId);

    if (waitingToken && !waitingProof) {
      return NextResponse.json(
        { error: "Seu pedido de entrada expirou. Tente entrar novamente.", waitingExpired: true },
        { status: 410 },
      );
    }

    if (waitingProof && waitingProof.displayName !== safeDisplayName) {
      return NextResponse.json({ error: "Pedido de entrada inválido." }, { status: 403 });
    }

    const resumed = verifyAppSession(resumeToken);
    const resumeSession = resumed?.roomId === roomId ? resumed : null;
    const canResume = Boolean(resumeSession);
    const identity = waitingProof?.identity ?? resumeSession?.identity ?? randomUUID();

    const service = getRoomService();
    let room = await ensureRoom(roomId, identity);
    let metadata = parseRoomMetadata(room.metadata);
    metadata = { ...metadata, waiting: pruneWaitingRequests(metadata.waiting) };
    let participants = await service.listParticipants(roomId);
    let role: "host" | "guest" = metadata.hostIdentity === identity ? "host" : "guest";

    const currentHostConnected = Boolean(
      metadata.hostIdentity && participants.some((participant) => participant.identity === metadata.hostIdentity),
    );

    if (resumeSession?.role === "host" && metadata.hostIdentity === resumeSession.identity) {
      role = "host";
    } else if (!currentHostConnected && participants.length === 0) {
      role = "host";
      metadata = { ...metadata, hostIdentity: identity, locked: false, waiting: [] };
      room = await service.updateRoomMetadata(roomId, JSON.stringify(metadata));
    }

    participants = await service.listParticipants(roomId);
    const alreadyConnected = participants.some((participant) => participant.identity === identity);

    if (waitingProof && cancelWaiting) {
      metadata = {
        ...metadata,
        waiting: pruneWaitingRequests(metadata.waiting).filter((entry) => entry.id !== waitingProof.requestId),
      };
      await service.updateRoomMetadata(roomId, JSON.stringify(metadata));
      return NextResponse.json({ ok: true, cancelled: true });
    }

    if (metadata.locked && role !== "host" && !(canResume && alreadyConnected)) {
      let waiting = pruneWaitingRequests(metadata.waiting);

      if (!waitingProof) {
        if (participants.length >= MAX_PARTICIPANTS) {
          return NextResponse.json(
            { error: "Esta sala está cheia. Limite de 6 participantes atingido." },
            { status: 409 },
          );
        }

        const created = createWaitingRequest(roomId, safeDisplayName);
        waiting = [...waiting, created.request].slice(-8);
        metadata = { ...metadata, waiting };
        await service.updateRoomMetadata(roomId, JSON.stringify(metadata));

        return NextResponse.json(
          {
            waiting: true,
            waitingStatus: "pending",
            waitingToken: created.token,
            message: "Pedido enviado. Aguardando o host liberar sua entrada.",
          },
          { status: 202 },
        );
      }

      const entry = waiting.find(
        (item) => item.id === waitingProof.requestId && item.identity === waitingProof.identity,
      );

      if (!entry) {
        return NextResponse.json(
          { error: "Seu pedido de entrada expirou. Tente novamente.", waitingExpired: true },
          { status: 410 },
        );
      }

      if (entry.status === "rejected") {
        metadata = { ...metadata, waiting: waiting.filter((item) => item.id !== entry.id) };
        await service.updateRoomMetadata(roomId, JSON.stringify(metadata));
        return NextResponse.json(
          { error: "O host recusou sua entrada nesta sala.", rejected: true },
          { status: 403 },
        );
      }

      if (entry.status === "pending") {
        return NextResponse.json(
          {
            waiting: true,
            waitingStatus: "pending",
            waitingToken,
            message: "Aguardando o host liberar sua entrada.",
          },
          { status: 202 },
        );
      }

      if (participants.length >= MAX_PARTICIPANTS) {
        return NextResponse.json(
          {
            waiting: true,
            waitingStatus: "approved",
            waitingToken,
            message: "Entrada aprovada. Aguardando uma vaga na sala.",
          },
          { status: 202 },
        );
      }

      metadata = { ...metadata, waiting: waiting.filter((item) => item.id !== entry.id) };
      room = await service.updateRoomMetadata(roomId, JSON.stringify(metadata));
    } else if (waitingProof) {
      const waiting = pruneWaitingRequests(metadata.waiting);
      if (waiting.some((item) => item.id === waitingProof.requestId)) {
        metadata = { ...metadata, waiting: waiting.filter((item) => item.id !== waitingProof.requestId) };
        room = await service.updateRoomMetadata(roomId, JSON.stringify(metadata));
      }
    }

    if (!alreadyConnected && participants.length >= MAX_PARTICIPANTS) {
      return NextResponse.json(
        { error: "Esta sala está cheia. Limite de 6 participantes atingido." },
        { status: 409 },
      );
    }

    const token = await createParticipantToken({ roomId, identity, displayName: safeDisplayName, role, badge });
    const appSession = createAppSession(roomId, identity, role);

    return NextResponse.json({
      token,
      serverUrl: getLiveKitWsUrl(),
      appSession,
      identity,
      role,
      displayName: safeDisplayName,
      badge: badge ?? null,
      locked: Boolean(metadata.locked),
    });
  } catch (error) {
    console.error("Falha ao gerar token LiveKit", error);
    return NextResponse.json(
      { error: "Não foi possível preparar a chamada. Verifique a configuração do servidor e tente novamente." },
      { status: 500 },
    );
  }
}
