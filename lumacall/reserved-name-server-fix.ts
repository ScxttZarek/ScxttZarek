import { createHmac, timingSafeEqual } from "node:crypto";
import { sanitizeDisplayName } from "@/lib/utils";

export type ReservedBadge = "creator" | "editor";

type ReservedIdentity = {
  canonicalName: "OHenrique" | "UserQubo";
  badge: ReservedBadge;
  codeEnv: "RESERVED_OHENRIQUE_CODE" | "RESERVED_USERQUBO_CODE";
};

const RESERVED: ReservedIdentity[] = [
  { canonicalName: "OHenrique", badge: "creator", codeEnv: "RESERVED_OHENRIQUE_CODE" },
  { canonicalName: "UserQubo", badge: "editor", codeEnv: "RESERVED_USERQUBO_CODE" },
];

function normalize(value: string) {
  return sanitizeDisplayName(value).toLocaleLowerCase("pt-BR");
}

export function reservedIdentityForName(displayName: string): ReservedIdentity | null {
  const normalized = normalize(displayName);
  return RESERVED.find((item) => item.canonicalName.toLocaleLowerCase("pt-BR") === normalized) ?? null;
}

function constantTimeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function signingSecret() {
  const secret = process.env.LIVEKIT_API_SECRET;
  if (!secret) throw new Error("LIVEKIT_API_SECRET ausente.");
  return secret;
}

export function verifyReservedAccessCode(displayName: string, code: string) {
  const reserved = reservedIdentityForName(displayName);
  if (!reserved) return null;

  const expected = process.env[reserved.codeEnv];
  if (!expected) throw new Error(`Variável de ambiente ausente: ${reserved.codeEnv}`);
  if (!constantTimeEqual(code, expected)) return null;
  return reserved;
}

export function createReservedNameProof(identity: ReservedIdentity) {
  const payload = Buffer.from(JSON.stringify({
    name: identity.canonicalName,
    badge: identity.badge,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30,
  })).toString("base64url");

  const signature = createHmac("sha256", signingSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyReservedNameProof(proof: string | undefined, requestedName: string) {
  if (!proof) return null;
  const [payload, signature] = proof.split(".");
  if (!payload || !signature) return null;

  const expected = createHmac("sha256", signingSecret()).update(payload).digest("base64url");
  if (!constantTimeEqual(signature, expected)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      name?: string;
      badge?: ReservedBadge;
      exp?: number;
    };

    if (!parsed.name || !parsed.badge || !parsed.exp || parsed.exp < Date.now()) return null;

    const reserved = reservedIdentityForName(requestedName);
    if (!reserved) return null;
    if (reserved.canonicalName !== parsed.name || reserved.badge !== parsed.badge) return null;

    return reserved;
  } catch {
    return null;
  }
}
