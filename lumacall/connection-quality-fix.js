const fs = require("fs");

const path = "components/call/participant-tile.tsx";
let src = fs.readFileSync(path, "utf8");

const stateAnchor = '  const reservedAvatar = reservedAvatarForBadge(badge);';
if (!src.includes(stateAnchor)) throw new Error("ParticipantTile anchor não encontrado.");

src = src.replace(
  stateAnchor,
  stateAnchor + `
  const rawConnectionQuality = String(participant.connectionQuality || "unknown").toLowerCase();
  const connectionQuality =
    rawConnectionQuality === "excellent" || rawConnectionQuality === "good"
      ? { label: "boa", dot: "bg-emerald-400" }
      : rawConnectionQuality === "poor"
        ? { label: "instável", dot: "bg-amber-400" }
        : rawConnectionQuality === "lost"
          ? { label: "ruim", dot: "bg-red-400" }
          : { label: "calculando", dot: "bg-zinc-500" };
`
);

const controlsAnchor = '      <div className="flex items-center gap-1.5">\n        <span className={cn("grid size-7 place-items-center rounded-lg backdrop-blur-md"';
if (!src.includes(controlsAnchor)) throw new Error("Controles do ParticipantTile não encontrados.");

src = src.replace(
  controlsAnchor,
  '      <div className="flex items-center gap-1.5">\n        <span className="grid size-5 shrink-0 place-items-center" title={"Conexão " + connectionQuality.label} aria-label={"Conexão " + connectionQuality.label}><span className={cn("size-2.5 rounded-full ring-2 ring-black/45 shadow-sm", connectionQuality.dot)} /></span>\n        <span className={cn("grid size-7 place-items-center rounded-lg backdrop-blur-md"'
);

fs.writeFileSync(path, src);
