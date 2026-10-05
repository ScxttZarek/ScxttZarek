import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export type WaitingStatus = "pending" | "approved" | "rejected";

export type WaitingRequest = {
  id: string;
  identity: string;
  displayName: string;
  status: WaitingStatus;
  expiresAt: number;
};

type WaitingTokenPayload = {
  roomId: string;
  requestId: string;
  identity: string;
  displayName: string;
  exp: number;
};

function secret() {
  const value = process.env.LIVEKIT_API_SECRET;
  if (!value) throw new Error("LIVEKIT_API_SECRET não configurado.");
  return value;
}

function encode(value: object) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(encoded: string) {
  return createHmac("sha256", secret()).update("waiting-room:" + encoded).digest("base64url");
}

export function createWaitingRequest(roomId: string, displayName: string) {
  const now = Date.now();
  const request: WaitingRequest = {
    id: randomUUID(),
    identity: randomUUID(),
    displayName,
    status: "pending",
    expiresAt: now + 5 * 60_000,
  };
  const payload: WaitingTokenPayload = {
    roomId,
    requestId: request.id,
    identity: request.identity,
    displayName,
    exp: Math.floor(request.expiresAt / 1000),
  };
  const encoded = encode(payload);
  return { request, token: encoded + "." + sign(encoded) };
}

export function verifyWaitingToken(token: string | undefined, roomId: string) {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as WaitingTokenPayload;
    if (!payload.roomId || !payload.requestId || !payload.identity || !payload.displayName || !payload.exp) return null;
    if (payload.roomId !== roomId) return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function pruneWaitingRequests(value: unknown): WaitingRequest[] {
  if (!Array.isArray(value)) return [];
  const now = Date.now();
  return value.filter((entry): entry is WaitingRequest => {
    if (!entry || typeof entry !== "object") return false;
    const item = entry as Partial<WaitingRequest>;
    return typeof item.id === "string"
      && typeof item.identity === "string"
      && typeof item.displayName === "string"
      && (item.status === "pending" || item.status === "approved" || item.status === "rejected")
      && typeof item.expiresAt === "number"
      && item.expiresAt > now;
  }).slice(-8);
}
