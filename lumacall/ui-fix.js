const fs = require("fs");

function replace(path, from, to) {
  const source = fs.readFileSync(path, "utf8");
  if (!source.includes(from)) throw new Error("Trecho esperado não encontrado em " + path);
  fs.writeFileSync(path, source.replace(from, to));
}

replace(
  "components/call/participant-tile.tsx",
  'compact ? "aspect-video" : "min-h-0"',
  'compact ? "aspect-square h-full" : "aspect-square min-h-0"'
);

replace(
  "components/call/call-room.tsx",
  'className="scrollbar-thin flex h-[132px] shrink-0 gap-2 overflow-x-auto"',
  'className="scrollbar-thin flex h-[148px] shrink-0 gap-2 overflow-x-auto pb-1"'
);

replace(
  "components/call/call-room.tsx",
  'className="h-full w-[210px] shrink-0"',
  'className="aspect-square h-full shrink-0"'
);

replace(
  "components/call/call-room.tsx",
  '<div className="relative h-full"><div className="grid h-full gap-2"',
  '<div className="relative h-full overflow-y-auto"><div className="mx-auto grid min-h-full w-full max-w-6xl content-center gap-3"'
);

replace(
  "components/call/call-room.tsx",
  ', gridAutoRows: "minmax(0, 1fr)"',
  ''
);

replace(
  "components/call/call-room.tsx",
  '{participants.map((participant) => <ParticipantTile key={participant.identity} participant={participant} revision={revision} canModerate={isHost} onMute={muteParticipant} onRemove={setRemoveTarget} />)}</div>',
  '{participants.map((participant) => <div key={participant.identity} className="mx-auto aspect-square w-full max-w-[360px]"><ParticipantTile participant={participant} revision={revision} compact canModerate={isHost} onMute={muteParticipant} onRemove={setRemoveTarget} /></div>)}</div>'
);

const cssPath = "app/globals.css";
let css = fs.readFileSync(cssPath, "utf8");
if (!css.includes(".screen-share-frame:fullscreen")) {
  css += "\n\n.screen-share-frame:fullscreen {\n  width: 100vw;\n  height: 100vh;\n  border: 0;\n  border-radius: 0;\n  background: #050506;\n}\n";
  fs.writeFileSync(cssPath, css);
}
