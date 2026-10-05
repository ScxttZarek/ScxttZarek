const fs = require("fs");

const participantPath = "components/call/participant-tile.tsx";
let participant = fs.readFileSync(participantPath, "utf8");
if (!participant.includes('compact ? "aspect-video" : "min-h-0"')) {
  throw new Error("Não foi possível localizar o tamanho original dos participantes.");
}
participant = participant.replace(
  'compact ? "aspect-video" : "min-h-0"',
  'compact ? "aspect-square h-full w-full" : "min-h-0"'
);
fs.writeFileSync(participantPath, participant);

const callPath = "components/call/call-room.tsx";
let call = fs.readFileSync(callPath, "utf8");

if (!call.includes('const columns = participants.length <= 1 ? 1 : participants.length <= 4 ? 2 : 3;')) {
  throw new Error("Não foi possível localizar o cálculo original da grade.");
}
call = call.replace(
  'const columns = participants.length <= 1 ? 1 : participants.length <= 4 ? 2 : 3;',
  'const tileCount = participants.length;\n  const columns = tileCount <= 1 ? 1 : tileCount <= 4 ? 2 : 3;'
);

const mainOpen = '      <main className={cn("h-full p-3 transition-[padding] duration-200", panelOpen ? "pr-[362px]" : "pr-3")}>';
const mainClose = '\n      </main>';
const start = call.indexOf(mainOpen);
const end = call.indexOf(mainClose, start);

if (start === -1 || end === -1) {
  throw new Error("Não foi possível localizar a área principal da chamada.");
}

const newMain = [
  '      <main className={cn("lumacall-call-stage min-h-0 flex-1 p-3 transition-[padding] duration-200", panelOpen ? "pr-[362px]" : "pr-3")}>',
  '        <div className="relative h-full overflow-y-auto">',
  '          <div className="mx-auto grid min-h-full w-full max-w-6xl content-center gap-3 py-1" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>',
  '            {participants.map((participant) => {',
  '              const sharingThisParticipant = screenParticipant?.identity === participant.identity;',
  '              return <div key={participant.identity} className="mx-auto aspect-square w-full max-w-[420px]">',
  '                {sharingThisParticipant',
  '                  ? <ScreenShareView participant={participant} revision={revision} focused={focusScreen} onToggleFocus={() => setFocusScreen((value) => !value)} />',
  '                  : <ParticipantTile participant={participant} revision={revision} compact canModerate={isHost} onMute={muteParticipant} onRemove={setRemoveTarget} />}',
  '              </div>;',
  '            })}',
  '          </div>',
  '          {participants.length === 1 && !screenParticipant && <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-xl border border-white/[.07] bg-black/55 px-4 py-2.5 text-center shadow-xl shadow-black/20 backdrop-blur-md"><p className="text-xs font-medium text-zinc-300">Você está sozinho por enquanto.</p><p className="mt-0.5 text-[10px] text-zinc-600">Compartilhe o link da sala para convidar alguém.</p></div>}',
  '        </div>',
  '      </main>'
].join("\n");

call = call.slice(0, start) + newMain + call.slice(end + mainClose.length);
fs.writeFileSync(callPath, call);

const cssPath = "app/globals.css";
let css = fs.readFileSync(cssPath, "utf8");
if (!css.includes(".screen-share-frame:fullscreen")) {
  css += "\n\n.screen-share-frame:fullscreen {\n  width: 100vw;\n  height: 100vh;\n  border: 0;\n  border-radius: 0;\n  background: #050506;\n}\n";
}
fs.writeFileSync(cssPath, css);
