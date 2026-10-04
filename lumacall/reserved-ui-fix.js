const fs = require("fs");

function replace(path, from, to) {
  const source = fs.readFileSync(path, "utf8");
  if (!source.includes(from)) throw new Error("Trecho esperado não encontrado em " + path + ": " + from.slice(0, 80));
  fs.writeFileSync(path, source.replace(from, to));
}

replace(
  "lib/validation.ts",
  '  resumeToken: z.string().max(4096).optional(),',
  '  resumeToken: z.string().max(4096).optional(),\n  reservedNameProof: z.string().max(4096).optional(),'
);

replace(
  "types/call.ts",
  '  cameraId?: string;\n};',
  '  cameraId?: string;\n  reservedNameProof?: string;\n};'
);

replace(
  "components/home/home-client.tsx",
  'import { DISPLAY_NAME_KEY, NameModal } from "@/components/ui/name-modal";',
  'import { DISPLAY_NAME_KEY, RESERVED_NAME_PROOF_KEY, NameModal } from "@/components/ui/name-modal";'
);

replace(
  "components/home/home-client.tsx",
  '    const saved = sanitizeDisplayName(localStorage.getItem(DISPLAY_NAME_KEY) || "");\n    if (saved) setDisplayName(saved);\n    else setNameOpen(true);',
  '    const saved = sanitizeDisplayName(localStorage.getItem(DISPLAY_NAME_KEY) || "");\n    const reserved = ["ohenrique", "userqubo"].includes(saved.toLocaleLowerCase("pt-BR"));\n    const proof = localStorage.getItem(RESERVED_NAME_PROOF_KEY) || "";\n    if (saved) {\n      setDisplayName(saved);\n      if (reserved && !proof) setNameOpen(true);\n    } else setNameOpen(true);'
);

replace(
  "components/call/pre-join.tsx",
  'import { DISPLAY_NAME_KEY, NameModal } from "@/components/ui/name-modal";',
  'import { DISPLAY_NAME_KEY, RESERVED_NAME_PROOF_KEY, NameModal } from "@/components/ui/name-modal";'
);

replace(
  "components/call/pre-join.tsx",
  '    const saved = sanitizeDisplayName(localStorage.getItem(DISPLAY_NAME_KEY) || "");\n    setDisplayName(saved);\n    if (!saved) setNameModal(true);',
  '    const saved = sanitizeDisplayName(localStorage.getItem(DISPLAY_NAME_KEY) || "");\n    const reserved = ["ohenrique", "userqubo"].includes(saved.toLocaleLowerCase("pt-BR"));\n    const proof = localStorage.getItem(RESERVED_NAME_PROOF_KEY) || "";\n    setDisplayName(saved);\n    if (!saved || (reserved && !proof)) setNameModal(true);'
);

replace(
  "components/call/pre-join.tsx",
  '    localStorage.setItem(DISPLAY_NAME_KEY, cleanName);\n    onJoin({ displayName: cleanName, micEnabled, cameraEnabled, microphoneId: microphoneId || undefined, cameraId: cameraId || undefined });',
  '    const reserved = ["ohenrique", "userqubo"].includes(cleanName.toLocaleLowerCase("pt-BR"));\n    const reservedNameProof = localStorage.getItem(RESERVED_NAME_PROOF_KEY) || undefined;\n    if (reserved && !reservedNameProof) {\n      setNameModal(true);\n      return;\n    }\n    localStorage.setItem(DISPLAY_NAME_KEY, cleanName);\n    onJoin({ displayName: cleanName, micEnabled, cameraEnabled, microphoneId: microphoneId || undefined, cameraId: cameraId || undefined, reservedNameProof });'
);

replace(
  "components/call/room-client.tsx",
  '        body: JSON.stringify({ roomId, displayName: preferencesToUse.displayName, resumeToken }),',
  '        body: JSON.stringify({ roomId, displayName: preferencesToUse.displayName, resumeToken, reservedNameProof: preferencesToUse.reservedNameProof }),'
);

replace(
  "components/call/settings-modal.tsx",
  'import { DISPLAY_NAME_KEY } from "@/components/ui/name-modal";',
  'import { DISPLAY_NAME_KEY, RESERVED_NAME_PROOF_KEY, NameModal } from "@/components/ui/name-modal";'
);

replace(
  "components/call/settings-modal.tsx",
  '  const [savingName, setSavingName] = useState(false);',
  '  const [savingName, setSavingName] = useState(false);\n  const [nameModalOpen, setNameModalOpen] = useState(false);'
);

replace(
  "components/call/settings-modal.tsx",
  `  async function saveName(event: FormEvent) {\n    event.preventDefault();\n    const clean = sanitizeDisplayName(name);\n    if (clean.length < 2) return onToast("Digite um nome com pelo menos 2 caracteres.", "warning");\n    setSavingName(true);\n    try {\n      const response = await fetch("/api/livekit/profile", { method: "POST", headers: { "content-type": "application/json", authorization: \`Bearer \${appSessionToken}\` }, body: JSON.stringify({ displayName: clean }) });\n      const payload = await response.json();\n      if (!response.ok) throw new Error(payload.error);\n      localStorage.setItem(DISPLAY_NAME_KEY, clean);\n      setName(clean);\n      onToast("Nome atualizado.", "success");\n    } catch (error) {\n      onToast(error instanceof Error && error.message ? error.message : "Não foi possível alterar o nome.", "danger");\n    } finally { setSavingName(false); }\n  }`,
  `  async function persistName(clean: string, proof?: string) {\n    setSavingName(true);\n    try {\n      const response = await fetch("/api/livekit/profile", {\n        method: "POST",\n        headers: { "content-type": "application/json", authorization: \`Bearer \${appSessionToken}\` },\n        body: JSON.stringify({ displayName: clean, reservedNameProof: proof }),\n      });\n      const payload = await response.json();\n      if (!response.ok) {\n        if (payload.reservedNameRequired) {\n          setNameModalOpen(true);\n          return false;\n        }\n        throw new Error(payload.error);\n      }\n      localStorage.setItem(DISPLAY_NAME_KEY, payload.displayName || clean);\n      setName(payload.displayName || clean);\n      onToast("Nome atualizado.", "success");\n      return true;\n    } catch (error) {\n      onToast(error instanceof Error && error.message ? error.message : "Não foi possível alterar o nome.", "danger");\n      return false;\n    } finally {\n      setSavingName(false);\n    }\n  }\n\n  async function saveName(event: FormEvent) {\n    event.preventDefault();\n    const clean = sanitizeDisplayName(name);\n    if (clean.length < 2) return onToast("Digite um nome com pelo menos 2 caracteres.", "warning");\n    const proof = localStorage.getItem(RESERVED_NAME_PROOF_KEY) || undefined;\n    await persistName(clean, proof);\n  }`
);

replace(
  "components/call/settings-modal.tsx",
  '        <SettingsSection icon={<UserRound className="size-4" />} title="Usuário"><form onSubmit={saveName} className="flex gap-2"><input value={name} maxLength={24} onChange={(event) => setName(event.target.value)} className="focus-ring min-w-0 flex-1 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm" /><button disabled={savingName} className="focus-ring rounded-xl bg-white px-4 text-xs font-semibold text-zinc-950 disabled:opacity-50">Salvar</button></form></SettingsSection>',
  '        <SettingsSection icon={<UserRound className="size-4" />} title="Usuário"><form onSubmit={saveName} className="flex gap-2"><input value={name} maxLength={24} onChange={(event) => setName(event.target.value)} className="focus-ring min-w-0 flex-1 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm" /><button disabled={savingName} className="focus-ring rounded-xl bg-white px-4 text-xs font-semibold text-zinc-950 disabled:opacity-50">Salvar</button></form><p className="text-[10px] text-zinc-600">Nomes reservados solicitam um código de acesso.</p></SettingsSection>'
);

replace(
  "components/call/settings-modal.tsx",
  '      </div>\n    </div>\n  </div>;',
  '      </div>\n    </div>\n    <NameModal open={nameModalOpen} initialName={name} onClose={() => setNameModalOpen(false)} onSave={(nextName, proof) => { setName(nextName); setNameModalOpen(false); void persistName(nextName, proof); }} />\n  </div>;'
);

replace(
  "components/call/participant-tile.tsx",
  'import { Crown, Mic, MicOff, MoreHorizontal, MonitorUp, UserX, VolumeX } from "lucide-react";',
  'import { Crown, Mic, MicOff, MoreHorizontal, MonitorUp, Scissors, Sparkles, UserX, VolumeX } from "lucide-react";'
);

replace(
  "components/call/participant-tile.tsx",
  'function isHost(participant: Participant) {\n  try { return JSON.parse(participant.metadata || "{}").role === "host"; } catch { return false; }\n}',
  'function participantMeta(participant: Participant) { try { return JSON.parse(participant.metadata || "{}") as { role?: string; badge?: "creator" | "editor" }; } catch { return {}; } }\nfunction isHost(participant: Participant) { return participantMeta(participant).role === "host"; }'
);

replace(
  "components/call/participant-tile.tsx",
  '  const host = isHost(participant);',
  '  const host = isHost(participant);\n  const badge = participantMeta(participant).badge;'
);

replace(
  "components/call/participant-tile.tsx",
  '<span className="truncate text-xs font-medium text-white">{participant.name || "Participante"}{participant.isLocal ? " (você)" : ""}</span>\n        {host &&',
  '<span className="truncate text-xs font-medium text-white">{participant.name || "Participante"}{participant.isLocal ? " (você)" : ""}</span>\n        {badge === "creator" && <span title="Criador" className="inline-flex shrink-0 items-center gap-1 rounded-md border border-violet-300/20 bg-violet-300/10 px-1.5 py-0.5 text-[9px] font-semibold text-violet-200"><Sparkles className="size-2.5" />CRIADOR</span>}\n        {badge === "editor" && <span title="Editor" className="inline-flex shrink-0 items-center gap-1 rounded-md border border-cyan-300/20 bg-cyan-300/10 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-200"><Scissors className="size-2.5" />EDITOR</span>}\n        {host &&'
);

replace(
  "components/call/participants-panel.tsx",
  'import { Crown, Mic, MicOff, MonitorUp, X } from "lucide-react";',
  'import { Crown, Mic, MicOff, MonitorUp, Scissors, Sparkles, X } from "lucide-react";'
);

replace(
  "components/call/participants-panel.tsx",
  'function host(participant: Participant) { try { return JSON.parse(participant.metadata || "{}").role === "host"; } catch { return false; } }',
  'function meta(participant: Participant) { try { return JSON.parse(participant.metadata || "{}") as { role?: string; badge?: "creator" | "editor" }; } catch { return {}; } }\nfunction host(participant: Participant) { return meta(participant).role === "host"; }'
);

replace(
  "components/call/participants-panel.tsx",
  '<span className="truncate text-xs font-medium text-zinc-200">{participant.name || "Participante"}{participant.isLocal ? " (você)" : ""}</span>{host(participant) && <Crown className="size-3 text-amber-300" />}',
  '<span className="truncate text-xs font-medium text-zinc-200">{participant.name || "Participante"}{participant.isLocal ? " (você)" : ""}</span>{meta(participant).badge === "creator" && <span title="Criador" className="inline-flex items-center gap-1 rounded-md bg-violet-300/10 px-1.5 py-0.5 text-[8px] font-semibold text-violet-200"><Sparkles className="size-2.5" />CRIADOR</span>}{meta(participant).badge === "editor" && <span title="Editor" className="inline-flex items-center gap-1 rounded-md bg-cyan-300/10 px-1.5 py-0.5 text-[8px] font-semibold text-cyan-200"><Scissors className="size-2.5" />EDITOR</span>}{host(participant) && <Crown className="size-3 text-amber-300" />}'
);
