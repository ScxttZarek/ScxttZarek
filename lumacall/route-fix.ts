import { NextResponse } from "next/server";
import { MAX_PARTICIPANTS } from "@/lib/constants";
import { bearerSession } from "@/lib/livekit/app-session";
import { getRoomService, parseRoomMetadata } from "@/lib/livekit/server";
import { pruneWaitingRequests } from "@/lib/livekit/waiting-room";
import { allowRequest, requestIp } from "@/lib/rate-limit";
import { moderationRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ip = requestIp(request.headers);
    if (!allowRequest("moderate:" + ip, 60, 60_000)) {
      return NextResponse.json({ error: "Muitas ações em sequência. Tente novamente em instantes." }, { status: 429 });
    }

    const session = bearerSession(request.headers);
    if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

    const parsed = moderationRequestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Ação inválida." }, { status: 400 });

    const action = parsed.data;
    const service = getRoomService();
    const rooms = await service.listRooms([session.roomId]);
    const room = rooms[0];
    if (!room) return NextResponse.json({ error: "Esta sala não existe mais." }, { status: 404 });

    const metadata = parseRoomMetadata(room.metadata);
    const participants = await service.listParticipants(session.roomId);
    const requesterConnected = participants.some((participant) => participant.identity === session.identity);
    const isCurrentHost = session.role === "host" && metadata.hostIdentity === session.identity && requesterConnected;

    if (!isCurrentHost) {
      return NextResponse.json({ error: "Somente o host pode executar esta ação." }, { status: 403 });
    }

    if (action.action === "remove") {
      if (action.targetIdentity === session.identity) {
        return NextResponse.json({ error: "O host não pode remover a si mesmo por este menu." }, { status: 400 });
      }
      await service.removeParticipant(session.roomId, action.targetIdentity);
      return NextResponse.json({ ok: true });
    }

    if (action.action === "mute") {
      const targetIdentity = action.targetIdentity;
      const trackSid = action.trackSid;
      const target = participants.find((participant) => participant.identity === targetIdentity);
      const ownsTrack = target?.tracks.some((track) => track.sid === trackSid);
      if (!target || !ownsTrack) {
        return NextResponse.json({ error: "Microfone do participante não encontrado." }, { status: 404 });
      }
      await service.mutePublishedTrack(session.roomId, targetIdentity, trackSid, true);
      return NextResponse.json({ ok: true });
    }

    if (action.action === "wait-accept" || action.action === "wait-reject") {
      const waiting = pruneWaitingRequests(metadata.waiting);
      const target = waiting.find((entry) => entry.id === action.requestId);
      if (!target) {
        return NextResponse.json({ error: "Esse pedido de entrada não está mais disponível." }, { status: 404 });
      }

      if (action.action === "wait-accept" && participants.length >= MAX_PARTICIPANTS) {
        return NextResponse.json({ error: "A sala já está com 6 participantes." }, { status: 409 });
      }

      const nextStatus = action.action === "wait-accept" ? "approved" : "rejected";
      const nextWaiting = waiting.map((entry) =>
        entry.id === action.requestId ? { ...entry, status: nextStatus } : entry
      );
      await service.updateRoomMetadata(
        session.roomId,
        JSON.stringify({ ...metadata, waiting: nextWaiting }),
      );
      return NextResponse.json({ ok: true, status: nextStatus });
    }

    const nextMetadata = {
      ...metadata,
      locked: action.locked,
      waiting: pruneWaitingRequests(metadata.waiting),
    };
    await service.updateRoomMetadata(session.roomId, JSON.stringify(nextMetadata));
    return NextResponse.json({ ok: true, locked: action.locked });
  } catch (error) {
    console.error("Falha de moderação", error);
    return NextResponse.json({ error: "Não foi possível concluir esta ação." }, { status: 500 });
  }
}
