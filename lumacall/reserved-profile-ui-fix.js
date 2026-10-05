const fs = require("fs");

function replace(path, from, to) {
  const source = fs.readFileSync(path, "utf8");
  if (!source.includes(from)) throw new Error("Trecho de perfil n\u00e3o encontrado em " + path + ": " + from.slice(0, 100));
  fs.writeFileSync(path, source.replace(from, to));
}

replace(
  "components/call/participant-tile.tsx",
  'import { getInitial, cn } from "@/lib/utils";',
  'import { getInitial, cn } from "@/lib/utils";\nimport { reservedAvatarForBadge } from "@/lib/reserved-profile";'
);

replace(
  "components/call/participant-tile.tsx",
  '  const badge = participantMeta(participant).badge;',
  '  const badge = participantMeta(participant).badge;\n  const reservedAvatar = reservedAvatarForBadge(badge);'
);

replace(
  "components/call/participant-tile.tsx",
  '{cameraActive ? <video ref={videoRef} autoPlay playsInline muted={participant.isLocal} className="h-full w-full object-cover" /> : <div className="grid h-full min-h-36 place-items-center"><div className="text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl border border-white/[.07] bg-white/[.045] text-lg font-semibold text-zinc-300">{getInitial(participant.name || participant.identity)}</div><div className="mt-3 text-sm font-medium text-zinc-300">{participant.name || "Participante"}</div></div></div>}',
  '{cameraActive ? <video ref={videoRef} autoPlay playsInline muted={participant.isLocal} className="h-full w-full object-cover" /> : <div className="grid h-full min-h-36 place-items-center"><div className="text-center">{reservedAvatar ? <img src={reservedAvatar} alt="" className={cn("mx-auto size-24 rounded-full object-cover shadow-2xl", badge === "creator" ? "ring-2 ring-violet-400/60 shadow-violet-950/35" : "ring-2 ring-cyan-400/60 shadow-cyan-950/35")} /> : <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-white/[.07] bg-white/[.045] text-lg font-semibold text-zinc-300">{getInitial(participant.name || participant.identity)}</div>}<div className="mt-3 text-sm font-medium text-zinc-300">{participant.name || "Participante"}</div></div></div>}'
);

replace(
  "components/call/participant-tile.tsx",
  '{badge === "creator" && <span title="Criador" className="inline-flex shrink-0 items-center gap-1 rounded-md border border-violet-300/20 bg-violet-300/10 px-1.5 py-0.5 text-[9px] font-semibold text-violet-200"><Sparkles className="size-2.5" />CRIADOR</span>}',
  '{badge === "creator" && <span title="Criador" className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-violet-300/30 bg-violet-400/[.14] px-2.5 py-1 text-[10px] font-bold tracking-[.08em] text-violet-100 shadow-[0_0_18px_rgba(139,92,246,.14)] backdrop-blur-md"><Sparkles className="size-3" />CRIADOR</span>}'
);

replace(
  "components/call/participant-tile.tsx",
  '{badge === "editor" && <span title="Editor" className="inline-flex shrink-0 items-center gap-1 rounded-md border border-cyan-300/20 bg-cyan-300/10 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-200"><Scissors className="size-2.5" />EDITOR</span>}',
  '{badge === "editor" && <span title="Editor" className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-cyan-300/30 bg-cyan-400/[.14] px-2.5 py-1 text-[10px] font-bold tracking-[.08em] text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,.12)] backdrop-blur-md"><Scissors className="size-3" />EDITOR</span>}'
);

replace(
  "components/call/participants-panel.tsx",
  'import { getInitial } from "@/lib/utils";',
  'import { getInitial } from "@/lib/utils";\nimport { reservedAvatarForBadge } from "@/lib/reserved-profile";'
);

replace(
  "components/call/participants-panel.tsx",
  '<div className="grid size-9 place-items-center rounded-xl border border-white/[.07] bg-white/[.04] text-xs font-semibold text-zinc-300">{getInitial(participant.name || participant.identity)}</div>',
  '{reservedAvatarForBadge(meta(participant).badge) ? <img src={reservedAvatarForBadge(meta(participant).badge)!} alt="" className={meta(participant).badge === "creator" ? "size-10 shrink-0 rounded-full object-cover ring-2 ring-violet-400/45" : "size-10 shrink-0 rounded-full object-cover ring-2 ring-cyan-400/45"} /> : <div className="grid size-9 place-items-center rounded-xl border border-white/[.07] bg-white/[.04] text-xs font-semibold text-zinc-300">{getInitial(participant.name || participant.identity)}</div>}'
);

replace(
  "components/call/participants-panel.tsx",
  '{meta(participant).badge === "creator" && <span title="Criador" className="inline-flex items-center gap-1 rounded-md bg-violet-300/10 px-1.5 py-0.5 text-[8px] font-semibold text-violet-200"><Sparkles className="size-2.5" />CRIADOR</span>}',
  '{meta(participant).badge === "creator" && <span title="Criador" className="inline-flex items-center gap-1.5 rounded-full border border-violet-300/20 bg-violet-400/10 px-2 py-1 text-[9px] font-bold tracking-[.07em] text-violet-100"><Sparkles className="size-3" />CRIADOR</span>}'
);

replace(
  "components/call/participants-panel.tsx",
  '{meta(participant).badge === "editor" && <span title="Editor" className="inline-flex items-center gap-1 rounded-md bg-cyan-300/10 px-1.5 py-0.5 text-[8px] font-semibold text-cyan-200"><Scissors className="size-2.5" />EDITOR</span>}',
  '{meta(participant).badge === "editor" && <span title="Editor" className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2 py-1 text-[9px] font-bold tracking-[.07em] text-cyan-100"><Scissors className="size-3" />EDITOR</span>}'
);

replace(
  "components/call/screen-share-view.tsx",
  'className="inline-flex shrink-0 items-center gap-1 rounded-md border border-violet-300/20 bg-violet-300/10 px-1.5 py-0.5 text-[8px] font-semibold text-violet-200"',
  'className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-violet-300/30 bg-violet-400/[.14] px-2 py-1 text-[9px] font-bold tracking-[.07em] text-violet-100"'
);

replace(
  "components/call/screen-share-view.tsx",
  '<Sparkles className="size-2.5" />CRIADOR',
  '<Sparkles className="size-3" />CRIADOR'
);

replace(
  "components/call/screen-share-view.tsx",
  'className="inline-flex shrink-0 items-center gap-1 rounded-md border border-cyan-300/20 bg-cyan-300/10 px-1.5 py-0.5 text-[8px] font-semibold text-cyan-200"',
  'className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-cyan-300/30 bg-cyan-400/[.14] px-2 py-1 text-[9px] font-bold tracking-[.07em] text-cyan-100"'
);

replace(
  "components/call/screen-share-view.tsx",
  '<Scissors className="size-2.5" />EDITOR',
  '<Scissors className="size-3" />EDITOR'
);
