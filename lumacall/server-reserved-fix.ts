import { AccessToken, RoomServiceClient, VideoGrant } from "livekit-server-sdk";
import { MAX_PARTICIPANTS } from "@/lib/constants";
import type { ReservedBadge } from "@/lib/reserved-name-server";

export type RoomMetadata = {
  hostIdentity?: string;
  locked?: boolean;
};

function env(name: "NEXT_PUBLIC_LIVEKIT_URL" | "LIVEKIT_API_KEY" | "LIVEKIT_API_SECRET") {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

export function getLiveKitWsUrl() {
  return env("NEXT_PUBLIC_LIVEKIT_URL");
}

export function getLiveKitApiUrl() {
  const url = getLiveKitWsUrl();
  if (url.startsWith("wss://")) return `https://${url.slice(6)}`;
  if (url.startsWith("ws://")) return `http://${url.slice(5)}`;
  return url;
}

export function getRoomService() {
  return new RoomServiceClient(getLiveKitApiUrl(), env("LIVEKIT_API_KEY"), env("LIVEKIT_API_SECRET"));
}

export function parseRoomMetadata(raw?: string): RoomMetadata {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as RoomMetadata;
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export async function ensureRoom(roomId: string, initialHostIdentity?: string) {
  const service = getRoomService();
  const existing = await service.listRooms([roomId]);
  if (existing[0]) return existing[0];

  try {
    return await service.createRoom({
      name: roomId,
      maxParticipants: MAX_PARTICIPANTS,
      emptyTimeout: 5 * 60,
      departureTimeout: 30,
      metadata: JSON.stringify({ locked: false, hostIdentity: initialHostIdentity }),
    });
  } catch {
    const raced = await service.listRooms([roomId]);
    if (!raced[0]) throw new Error("Não foi possível criar a sala.");
    return raced[0];
  }
}

export async function createParticipantToken(params: {
  roomId: string;
  identity: string;
  displayName: string;
  role: "host" | "guest";
  badge?: ReservedBadge;
}) {
  const token = new AccessToken(env("LIVEKIT_API_KEY"), env("LIVEKIT_API_SECRET"), {
    identity: params.identity,
    name: params.displayName,
    ttl: "2h",
    metadata: JSON.stringify({ role: params.role, ...(params.badge ? { badge: params.badge } : {}) }),
  });

  const grant: VideoGrant = {
    roomJoin: true,
    room: params.roomId,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  };

  token.addGrant(grant);
  return token.toJwt();
}
