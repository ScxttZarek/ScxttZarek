const fs = require("fs");

function mustReplace(source, from, to, label) {
  if (!source.includes(from)) throw new Error("Não foi possível aplicar: " + label);
  return source.replace(from, to);
}

// Room metadata now carries a tiny, expiring waiting queue.
{
  const path = "lib/livekit/server.ts";
  let src = fs.readFileSync(path, "utf8");
  src = mustReplace(
    src,
    'export type RoomMetadata = {\n  hostIdentity?: string;\n  locked?: boolean;\n};',
    'export type RoomMetadata = {\n  hostIdentity?: string;\n  locked?: boolean;\n  waiting?: Array<{\n    id: string;\n    identity: string;\n    displayName: string;\n    status: "pending" | "approved" | "rejected";\n    expiresAt: number;\n  }>;\n};',
    "metadata da sala",
  );
  fs.writeFileSync(path, src);
}

// Validation for waiting tokens and host decisions.
{
  const path = "lib/validation.ts";
  let src = fs.readFileSync(path, "utf8");
  src = mustReplace(
    src,
    '  reservedNameProof: z.string().max(4096).optional(),\n});',
    '  reservedNameProof: z.string().max(4096).optional(),\n  waitingToken: z.string().max(4096).optional(),\n  cancelWaiting: z.boolean().optional(),\n});',
    "token da sala de espera",
  );
  src = mustReplace(
    src,
    '  z.object({ action: z.literal("lock"), locked: z.boolean() }),\n]);',
    '  z.object({ action: z.literal("lock"), locked: z.boolean() }),\n  z.object({ action: z.literal("wait-accept"), requestId: z.string().uuid() }),\n  z.object({ action: z.literal("wait-reject"), requestId: z.string().uuid() }),\n]);',
    "ações da sala de espera",
  );
  fs.writeFileSync(path, src);
}

// Call UI: persistent reconnect state + host waiting queue.
{
  const path = "components/call/call-room.tsx";
  let src = fs.readFileSync(path, "utf8");

  src = mustReplace(
    src,
    'import { Copy, Lock, LockOpen } from "lucide-react";',
    'import { Check, Copy, Lock, LockOpen, X } from "lucide-react";',
    "ícones da sala de espera",
  );

  src = mustReplace(
    src,
    '  const [toasts, setToasts] = useState<ToastItem[]>([]);',
    '  const [toasts, setToasts] = useState<ToastItem[]>([]);\n  const [waitingRequests, setWaitingRequests] = useState<Array<{ id: string; displayName: string }>>([]);',
    "estado da sala de espera",
  );

  const metaStart = src.indexOf('    const roomMetadata = (raw: string) => {');
  const metaEnd = src.indexOf('    const remoteTrackPublished', metaStart);
  if (metaStart < 0 || metaEnd < 0) throw new Error("Handler de metadata não encontrado.");
  const newMeta = [
    '    const roomMetadata = (raw: string) => {',
    '      rerender();',
    '      try {',
    '        const parsed = JSON.parse(raw || "{}") as { locked?: boolean; waiting?: Array<{ id?: string; displayName?: string; status?: string; expiresAt?: number }> };',
    '        const locked = Boolean(parsed.locked);',
    '        if (locked !== appSession.locked) onSessionChange({ ...appSession, locked });',
    '        const now = Date.now();',
    '        const pending = Array.isArray(parsed.waiting) ? parsed.waiting',
    '          .filter((entry) => entry?.status === "pending" && typeof entry.id === "string" && typeof entry.displayName === "string" && (!entry.expiresAt || entry.expiresAt > now))',
    '          .map((entry) => ({ id: entry.id as string, displayName: entry.displayName as string })) : [];',
    '        setWaitingRequests(pending);',
    '      } catch {',
    '        setWaitingRequests([]);',
    '      }',
    '    };',
    '',
  ].join("\n");
  src = src.slice(0, metaStart) + newMeta + src.slice(metaEnd);

  const eventsLine = '    visualEvents.forEach((event) => room.on(event, rerender));';
  src = mustReplace(
    src,
    eventsLine,
    eventsLine + '\n    roomMetadata(room.metadata || "{}");',
    "metadata inicial",
  );

  src = mustReplace(
    src,
    '      pushToast(payload.locked ? "Novas entradas foram bloqueadas." : "A sala está aberta para novas entradas.", "success");',
    '      pushToast(payload.locked ? "Sala trancada. Novas pessoas irão para a sala de espera." : "Sala aberta para entradas diretas.", "success");',
    "mensagem ao trancar",
  );

  const copyInviteMarker = '  async function copyInvite() {';
  const decisionFn = [
    '  async function decideWaiting(requestId: string, accept: boolean) {',
    '    const request = waitingRequests.find((item) => item.id === requestId);',
    '    try {',
    '      await moderate({ action: accept ? "wait-accept" : "wait-reject", requestId });',
    '      setWaitingRequests((items) => items.filter((item) => item.id !== requestId));',
    '      pushToast(accept ? (request?.displayName || "Participante") + " foi liberado para entrar." : "Pedido de entrada recusado.", accept ? "success" : "default");',
    '    } catch (error) {',
    '      pushToast(error instanceof Error ? error.message : "Não foi possível responder ao pedido.", "danger");',
    '    }',
    '  }',
    '',
  ].join("\n");
  src = mustReplace(src, copyInviteMarker, decisionFn + copyInviteMarker, "ações de aceitar e recusar");

  src = mustReplace(
    src,
    '  return <div className="mobile-call flex h-full flex-col bg-[#08090b]">',
    '  return <div className="mobile-call relative flex h-full flex-col bg-[#08090b]">',
    "container relativo",
  );

  src = mustReplace(
    src,
    '    <RoomAudioRenderer />',
    '    <RoomAudioRenderer />\n    {connectionState === ConnectionState.Reconnecting && <div className="pointer-events-none absolute left-1/2 top-[72px] z-[70] -translate-x-1/2 rounded-xl border border-amber-300/15 bg-[#15130d]/95 px-4 py-2.5 shadow-xl shadow-black/30"><div className="flex items-center gap-2"><span className="size-2 rounded-full bg-amber-300" /><div><p className="text-[11px] font-semibold text-amber-100">Reconectando...</p><p className="text-[9px] text-amber-200/55">Sua chamada será restaurada automaticamente.</p></div></div></div>}',
    "banner de reconexão",
  );

  const bodyMarker = '    <div className="relative min-h-0 flex-1 overflow-hidden">';
  const waitingPanel = [
    '    {isHost && waitingRequests.length > 0 && <div className="absolute right-3 top-[72px] z-[60] w-[min(330px,calc(100vw-24px))] rounded-2xl border border-violet-300/15 bg-[#101116]/98 p-3 shadow-2xl shadow-black/35">',
    '      <div className="mb-2 flex items-center justify-between gap-2"><div><p className="text-[11px] font-semibold text-zinc-200">Sala de espera</p><p className="text-[9px] text-zinc-600">{waitingRequests.length} aguardando</p></div><span className="rounded-full border border-violet-300/15 bg-violet-300/[.07] px-2 py-1 text-[9px] font-semibold text-violet-200">{waitingRequests.length}</span></div>',
    '      <div className="max-h-48 space-y-1.5 overflow-y-auto">{waitingRequests.map((request) => <div key={request.id} className="flex items-center gap-2 rounded-xl border border-white/[.05] bg-white/[.025] px-2.5 py-2"><div className="grid size-8 shrink-0 place-items-center rounded-full bg-violet-300/[.08] text-xs font-semibold text-violet-200">{(request.displayName.charAt(0) || "?").toUpperCase()}</div><span className="min-w-0 flex-1 truncate text-[11px] font-medium text-zinc-300">{request.displayName}</span><button onClick={() => decideWaiting(request.id, true)} className="focus-ring grid size-8 place-items-center rounded-lg border border-emerald-300/15 bg-emerald-300/[.08] text-emerald-200 hover:bg-emerald-300/[.13]" title="Aceitar entrada"><Check className="size-3.5" /></button><button onClick={() => decideWaiting(request.id, false)} className="focus-ring grid size-8 place-items-center rounded-lg border border-red-300/15 bg-red-300/[.07] text-red-200 hover:bg-red-300/[.12]" title="Recusar entrada"><X className="size-3.5" /></button></div>)}</div>',
    '    </div>}',
    '',
  ].join("\n");
  src = mustReplace(src, bodyMarker, waitingPanel + bodyMarker, "painel da sala de espera");

  src = src.replaceAll('title={appSession.locked ? "Permitir novas entradas" : "Bloquear novas entradas"}', 'title={appSession.locked ? "Abrir para entradas diretas" : "Ativar sala de espera"}');
  src = src.replaceAll('{appSession.locked ? "Sala fechada" : "Sala aberta"}', '{appSession.locked ? "Trancada" : "Aberta"}');

  fs.writeFileSync(path, src);
}

// Make the existing unread counter clearer to screen readers and at 99+.
{
  const path = "components/call/control-bar.tsx";
  let src = fs.readFileSync(path, "utf8");
  src = mustReplace(
    src,
    '<ControlButton title="Chat" highlighted={chatOpen} onClick={onChat}>',
    '<ControlButton title={unread > 0 && !chatOpen ? `Chat (${unread} não lidas)` : "Chat"} highlighted={chatOpen} onClick={onChat}>',
    "rótulo do contador do chat",
  );
  src = mustReplace(
    src,
    '{Math.min(unread, 99)}',
    '{unread > 99 ? "99+" : unread}',
    "limite visual do contador",
  );
  fs.writeFileSync(path, src);
}
