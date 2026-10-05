const fs = require("fs");

function mustReplace(src, from, to, label) {
  if (!src.includes(from)) throw new Error("Não foi possível aplicar: " + label);
  return src.replace(from, to);
}

// Modo foco + cronômetro na sala.
{
  const path = "components/call/call-room.tsx";
  let src = fs.readFileSync(path, "utf8");

  src = mustReplace(
    src,
    '  const [focusScreen, setFocusScreen] = useState(false);',
    '  const [focusScreen, setFocusScreen] = useState(false);\n  const [focusParticipantId, setFocusParticipantId] = useState<string | null>(null);\n  const [callStartedAt] = useState(() => Date.now());\n  const [elapsedSeconds, setElapsedSeconds] = useState(0);',
    "estados de foco e tempo",
  );

  src = mustReplace(
    src,
    '  useEffect(() => { localStorage.setItem("lumacall.shareQuality", shareQuality); }, [shareQuality]);',
    '  useEffect(() => { localStorage.setItem("lumacall.shareQuality", shareQuality); }, [shareQuality]);\n\n  useEffect(() => {\n    const tick = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - callStartedAt) / 1000)));\n    tick();\n    const timer = window.setInterval(tick, 1000);\n    return () => window.clearInterval(timer);\n  }, [callStartedAt]);',
    "cronômetro local",
  );

  src = mustReplace(
    src,
    '  useEffect(() => {\n    if (!screenParticipant) setFocusScreen(false);\n  }, [screenParticipant]);',
    '  useEffect(() => {\n    if (!screenParticipant) setFocusScreen(false);\n    if (focusParticipantId && !participants.some((participant) => participant.identity === focusParticipantId)) setFocusParticipantId(null);\n  }, [screenParticipant, participants, focusParticipantId]);',
    "limpeza do foco",
  );

  src = mustReplace(
    src,
    '  const tileCount = participants.length;\n  const columns = tileCount <= 1 ? 1 : tileCount <= 4 ? 2 : 3;\n  const panelOpen = chatOpen || participantsOpen;',
    '  const focusedParticipant = focusParticipantId ? participants.find((participant) => participant.identity === focusParticipantId) : undefined;\n  const focusActive = Boolean((focusScreen && screenParticipant) || focusedParticipant);\n  const displayedParticipants = focusScreen && screenParticipant ? [screenParticipant] : focusedParticipant ? [focusedParticipant] : participants;\n  const tileCount = displayedParticipants.length;\n  const columns = focusActive ? 1 : tileCount <= 1 ? 1 : tileCount <= 4 ? 2 : 3;\n  const panelOpen = chatOpen || participantsOpen;',
    "participantes visíveis no foco",
  );

  const headerAnchor = '<span className="rounded-md border border-white/[.07] bg-white/[.035] px-1.5 py-0.5 text-[9px] font-semibold text-zinc-500">{participants.length}/6</span>';
  src = mustReplace(
    src,
    headerAnchor,
    headerAnchor + '<span className="rounded-md border border-white/[.07] bg-white/[.025] px-1.5 py-0.5 font-mono text-[9px] font-semibold tabular-nums text-zinc-500" title="Tempo da chamada">{formatCallDuration(elapsedSeconds)}</span>',
    "tempo no cabeçalho",
  );

  src = mustReplace(
    src,
    '            {participants.map((participant) => {',
    '            {displayedParticipants.map((participant) => {',
    "grid filtrado pelo foco",
  );

  src = mustReplace(
    src,
    '              return <div key={participant.identity} className="mx-auto aspect-square w-full max-w-[420px]">',
    '              return <div key={participant.identity} className={cn("mx-auto w-full", focusActive ? "h-full max-w-[1180px]" : "aspect-square max-w-[420px]")}>',
    "tamanho do tile focado",
  );

  src = mustReplace(
    src,
    '                  ? <ScreenShareView participant={participant} revision={revision} focused={focusScreen} onToggleFocus={() => setFocusScreen((value) => !value)} />\n                  : <ParticipantTile participant={participant} revision={revision} compact canModerate={isHost} onMute={muteParticipant} onRemove={setRemoveTarget} />}',
    '                  ? <ScreenShareView participant={participant} revision={revision} focused={focusActive} onToggleFocus={() => { const isFocused = focusActive; setFocusParticipantId(null); setFocusScreen(!isFocused); }} />\n                  : <ParticipantTile participant={participant} revision={revision} compact={!focusActive} focused={focusActive} onToggleFocus={() => { setFocusScreen(false); setFocusParticipantId((current) => current === participant.identity ? null : participant.identity); }} canModerate={isHost} onMute={muteParticipant} onRemove={setRemoveTarget} />}',
    "controles de foco nos tiles",
  );

  src = mustReplace(
    src,
    '{participants.length === 1 && !screenParticipant && <div',
    '{participants.length === 1 && !screenParticipant && !focusActive && <div',
    "aviso de sala vazia no foco",
  );

  const endAnchor = 'function participantRole(participant: Participant) {';
  src = mustReplace(
    src,
    endAnchor,
    'function formatCallDuration(totalSeconds: number) {\n  const hours = Math.floor(totalSeconds / 3600);\n  const minutes = Math.floor((totalSeconds % 3600) / 60);\n  const seconds = totalSeconds % 60;\n  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");\n}\n\n' + endAnchor,
    "formatador do tempo",
  );

  fs.writeFileSync(path, src);
}

// Participante: botão e duplo clique para focar.
{
  const path = "components/call/participant-tile.tsx";
  let src = fs.readFileSync(path, "utf8");

  src = mustReplace(
    src,
    'import { Crown, Mic, MicOff, MoreHorizontal, MonitorUp, Scissors, Sparkles, UserX, VolumeX } from "lucide-react";',
    'import { Crown, Maximize2, Mic, MicOff, Minimize2, MoreHorizontal, MonitorUp, Scissors, Sparkles, UserX, VolumeX } from "lucide-react";',
    "ícones de foco do participante",
  );

  src = mustReplace(
    src,
    'export function ParticipantTile({ participant, revision, canModerate, onMute, onRemove, compact = false }: {',
    'export function ParticipantTile({ participant, revision, canModerate, onMute, onRemove, compact = false, focused = false, onToggleFocus }: {',
    "props do modo foco",
  );

  src = mustReplace(
    src,
    '  compact?: boolean;\n}) {',
    '  compact?: boolean;\n  focused?: boolean;\n  onToggleFocus?: () => void;\n}) {',
    "tipos do modo foco",
  );

  src = mustReplace(
    src,
    '  return <div className={cn("group relative overflow-hidden rounded-2xl border bg-[#0d0e11] transition", participant.isSpeaking ? "speaking border-violet-300/40" : "border-white/[.07]", compact ? "aspect-square h-full w-full" : "min-h-0")}>',
    '  return <div onDoubleClick={(event) => { if ((event.target as HTMLElement).closest("button")) return; onToggleFocus?.(); }} title={onToggleFocus ? (focused ? "Duplo clique para sair do foco" : "Duplo clique para focar") : undefined} className={cn("group relative overflow-hidden rounded-2xl border bg-[#0d0e11] transition", participant.isSpeaking ? "speaking border-violet-300/40" : "border-white/[.07]", focused ? "h-full w-full min-h-0" : compact ? "aspect-square h-full w-full" : "min-h-0", onToggleFocus && (focused ? "cursor-zoom-out" : "cursor-zoom-in"))}>',
    "interação de duplo clique",
  );

  src = mustReplace(
    src,
    '      <div className="flex items-center gap-1.5">\n        <span className="grid size-5 shrink-0 place-items-center"',
    '      <div className="flex items-center gap-1.5">\n        {onToggleFocus && <button type="button" onClick={onToggleFocus} className="focus-ring grid size-7 shrink-0 place-items-center rounded-lg bg-black/35 text-zinc-200 backdrop-blur-md transition hover:bg-black/55" title={focused ? "Sair do foco" : "Focar participante"} aria-label={focused ? "Sair do foco" : "Focar participante"}>{focused ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}</button>}\n        <span className="grid size-5 shrink-0 place-items-center"',
    "botão de foco",
  );

  fs.writeFileSync(path, src);
}

// Compartilhamento: modo foco separado de tela cheia.
{
  const path = "components/call/screen-share-view.tsx";
  let src = fs.readFileSync(path, "utf8");

  src = mustReplace(
    src,
    'import { Expand, Scissors, Sparkles, Volume2, VolumeX } from "lucide-react";',
    'import { Expand, Maximize2, Minimize2, Scissors, Sparkles, Volume2, VolumeX } from "lucide-react";',
    "ícones de foco da transmissão",
  );

  src = mustReplace(
    src,
    'export function ScreenShareView({\n  participant,\n  revision,\n}: {',
    'export function ScreenShareView({\n  participant,\n  revision,\n  focused = false,\n  onToggleFocus,\n}: {',
    "props de foco da transmissão",
  );

  const fullscreenAnchor = '          <button\n            type="button"\n            onClick={fullscreen}';
  src = mustReplace(
    src,
    fullscreenAnchor,
    '          {onToggleFocus && <button type="button" onClick={onToggleFocus} className="focus-ring grid size-8 place-items-center rounded-lg border border-white/[.08] bg-white/[.04] text-zinc-200 transition hover:bg-white/[.08]" title={focused ? "Sair do foco" : "Focar transmissão"} aria-label={focused ? "Sair do foco" : "Focar transmissão"}>{focused ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}</button>}\n\n' + fullscreenAnchor,
    "botão de foco da transmissão",
  );

  src = mustReplace(
    src,
    '      <div className="relative min-h-0 flex-1 bg-black">',
    '      <div onDoubleClick={onToggleFocus} className={focused ? "relative min-h-0 flex-1 cursor-zoom-out bg-black" : "relative min-h-0 flex-1 cursor-zoom-in bg-black"}>',
    "duplo clique na transmissão",
  );

  fs.writeFileSync(path, src);
}



{
  function around(path, needle, before = 500, after = 1500) {
    const source = fs.readFileSync(path, "utf8");
    const index = source.indexOf(needle);
    console.log("MCHECK|" + path + "|" + needle + "|" + JSON.stringify(index >= 0 ? source.slice(Math.max(0,index-before), index+after) : "NOT_FOUND"));
  }
  around("app/globals.css", "@media (max-width: 860px)", 200, 3400);
  around("app/globals.css", "@media (max-width: 560px)", 200, 2800);
  around("components/home/home-client.tsx", "<header", 200, 1900);
  around("components/call/pre-join.tsx", "return (", 300, 3500);
  around("components/call/settings-modal.tsx", "return (", 300, 3300);
  around("components/ui/mobile-gate.tsx", "return", 200, 2000);
  around("components/call/call-room.tsx", "participant-grid", 1200, 3000);
  around("components/call/call-room.tsx", "const onKey", 300, 1200);
  around("components/call/participants-panel.tsx", "return <aside", 100, 2500);
}
