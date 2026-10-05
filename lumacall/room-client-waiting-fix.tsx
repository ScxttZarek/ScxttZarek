"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LiveKitRoom } from "@livekit/components-react";
import { ArrowLeft, Hourglass, RotateCcw, ShieldCheck, X } from "lucide-react";
import { PreJoin } from "@/components/call/pre-join";
import { CallRoom } from "@/components/call/call-room";
import { MobileGate } from "@/components/ui/mobile-gate";
import type { AppSession, PreJoinPreferences } from "@/types/call";

const sessionKey = (roomId: string) => "lumacall.session." + roomId;

export function RoomClient({ roomId }: { roomId: string }) {
  const [phase, setPhase] = useState<"prejoin" | "connecting" | "waiting" | "call" | "left">("prejoin");
  const [preferences, setPreferences] = useState<PreJoinPreferences | null>(null);
  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [session, setSession] = useState<AppSession | null>(null);
  const [error, setError] = useState("");
  const [waitingToken, setWaitingToken] = useState("");
  const [waitingStatus, setWaitingStatus] = useState<"pending" | "approved">("pending");
  const [waitingMessage, setWaitingMessage] = useState("Aguardando o host liberar sua entrada.");

  const audioOptions = useMemo(() => preferences?.micEnabled ? {
    deviceId: preferences.microphoneId || undefined,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  } : false, [preferences]);

  const videoOptions = useMemo(() => preferences?.cameraEnabled ? {
    deviceId: preferences.cameraId || undefined,
    resolution: { width: 1280, height: 720, frameRate: 30 },
  } : false, [preferences]);

  function enterCall(payload: any) {
    const nextSession: AppSession = {
      token: payload.appSession,
      role: payload.role,
      identity: payload.identity,
      locked: Boolean(payload.locked),
    };
    sessionStorage.setItem(sessionKey(roomId), nextSession.token);
    setSession(nextSession);
    setToken(payload.token);
    setServerUrl(payload.serverUrl);
    setWaitingToken("");
    setPhase("call");
  }

  async function tokenRequest(preferencesToUse: PreJoinPreferences, waitToken?: string, cancelWaiting?: boolean) {
    const resumeToken = sessionStorage.getItem(sessionKey(roomId)) || undefined;
    const response = await fetch("/api/livekit/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        roomId,
        displayName: preferencesToUse.displayName,
        resumeToken,
        reservedNameProof: preferencesToUse.reservedNameProof,
        waitingToken: waitToken || undefined,
        cancelWaiting: cancelWaiting || undefined,
      }),
    });
    const payload = await response.json();
    return { response, payload };
  }

  async function join(preferencesToUse: PreJoinPreferences) {
    setPreferences(preferencesToUse);
    setPhase("connecting");
    setError("");
    setWaitingToken("");
    try {
      const { response, payload } = await tokenRequest(preferencesToUse);

      if (response.status === 202 && payload.waiting) {
        setWaitingToken(payload.waitingToken || "");
        setWaitingStatus(payload.waitingStatus === "approved" ? "approved" : "pending");
        setWaitingMessage(payload.message || "Aguardando o host liberar sua entrada.");
        setPhase("waiting");
        return;
      }

      if (!response.ok) throw new Error(payload.error || "Não foi possível entrar na sala.");
      enterCall(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível entrar na sala.");
      setPhase("prejoin");
    }
  }

  useEffect(() => {
    if (phase !== "waiting" || !preferences || !waitingToken) return;

    let cancelled = false;
    let timer: number | undefined;

    const poll = async () => {
      try {
        const { response, payload } = await tokenRequest(preferences, waitingToken);
        if (cancelled) return;

        if (response.ok) {
          enterCall(payload);
          return;
        }

        if (response.status === 202 && payload.waiting) {
          setWaitingStatus(payload.waitingStatus === "approved" ? "approved" : "pending");
          setWaitingMessage(payload.message || "Aguardando o host liberar sua entrada.");
          timer = window.setTimeout(poll, 3000);
          return;
        }

        setWaitingToken("");
        setError(payload.error || "Não foi possível entrar na sala.");
        setPhase("prejoin");
      } catch {
        if (!cancelled) {
          setWaitingMessage("Conexão instável. Tentando consultar o host novamente...");
          timer = window.setTimeout(poll, 3500);
        }
      }
    };

    timer = window.setTimeout(poll, 1500);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [phase, preferences, waitingToken, roomId]);

  async function cancelWaitingRequest() {
    const currentPreferences = preferences;
    const currentWaitingToken = waitingToken;
    setWaitingToken("");
    setWaitingStatus("pending");
    setWaitingMessage("Aguardando o host liberar sua entrada.");
    setPhase("prejoin");

    if (currentPreferences && currentWaitingToken) {
      try {
        await tokenRequest(currentPreferences, currentWaitingToken, true);
      } catch {
        // O pedido também expira automaticamente no servidor.
      }
    }
  }

  function updateSession(next: AppSession) {
    sessionStorage.setItem(sessionKey(roomId), next.token);
    setSession(next);
  }

  if (phase === "left") {
    return <><MobileGate /><main className="desktop-shell grid min-h-dvh place-items-center px-4 sm:px-6"><div className="glass w-full max-w-md rounded-3xl p-8 text-center"><h1 className="text-2xl font-semibold tracking-[-.035em]">Você saiu da chamada.</h1><p className="mt-2 text-sm text-zinc-400">A sala continua disponível enquanto houver participantes.</p><div className="mt-6 grid grid-cols-2 gap-2"><button onClick={() => setPhase("prejoin")} className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-zinc-950"><RotateCcw className="size-4" />Entrar novamente</button><Link href="/" className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm"><ArrowLeft className="size-4" />Voltar ao início</Link></div></div></main></>;
  }

  if (phase === "waiting") {
    return <><MobileGate /><main className="desktop-shell grid min-h-dvh place-items-center px-4 sm:px-6">
      <div className="glass w-full max-w-md rounded-3xl p-7 text-center sm:p-8">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-violet-300/15 bg-violet-300/[.07] text-violet-200">
          {waitingStatus === "approved" ? <ShieldCheck className="size-5" /> : <Hourglass className="size-5" />}
        </div>
        <p className="mt-5 text-[10px] font-semibold uppercase tracking-[.18em] text-zinc-600">Sala de espera</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-.035em]">
          {waitingStatus === "approved" ? "Entrada aprovada." : "Aguardando o host..."}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-400">{waitingMessage}</p>
        <div className="mt-5 rounded-2xl border border-white/[.06] bg-black/20 px-4 py-3">
          <p className="text-[10px] text-zinc-600">Sala</p>
          <p className="mt-1 font-mono text-xs font-semibold tracking-[.16em] text-zinc-300">{roomId}</p>
        </div>
        <button onClick={cancelWaitingRequest} className="focus-ring mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-white/[.08] bg-white/[.035] px-4 py-2.5 text-xs font-medium text-zinc-300 transition hover:bg-white/[.07]">
          <X className="size-3.5" />Cancelar pedido
        </button>
      </div>
    </main></>;
  }

  if (phase === "prejoin" || phase === "connecting") {
    return <><MobileGate /><div className="desktop-shell"><PreJoin roomId={roomId} onJoin={join} busy={phase === "connecting"} error={error} /></div></>;
  }

  if (!preferences || !session) return null;

  return <><MobileGate /><div className="desktop-shell h-dvh overflow-hidden"><LiveKitRoom
    token={token}
    serverUrl={serverUrl}
    connect
    audio={audioOptions}
    video={videoOptions}
    options={{ adaptiveStream: true, dynacast: true, disconnectOnPageLeave: true }}
    onError={(reason) => setError(reason.message || "Falha ao conectar à sala.")}
    onDisconnected={() => setPhase("left")}
  ><CallRoom roomId={roomId} appSession={session} onSessionChange={updateSession} onLeave={() => setPhase("left")} /></LiveKitRoom></div></>;
}
