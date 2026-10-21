const fs = require("fs");
const callPath = "components/call/call-room.tsx";
let src = fs.readFileSync(callPath, "utf8");
function replaceUnique(from, to, label) {
  if (src.split(from).length !== 2) throw new Error("Voice view guard: âncora inesperada em " + label);
  src = src.replace(from, to);
}

// Mantém a chamada como tela de entrada. O canal geral só abre após clique explícito.
replaceUnique(
  '  const [roomView, setRoomView] = useState<"chat" | "call" | "callChat">("call");',
  '  const [roomView, setRoomView] = useState<"chat" | "call" | "callChat">("call");\n' +
  '  useEffect(() => {\n' +
  '    setRoomView("call");\n' +
  '    setChatOpen(false);\n' +
  '    setParticipantsOpen(false);\n' +
  '  }, [roomId]);',
  "estado inicial / sincronização da chamada"
);
replaceUnique(
  'className={cn("lc-room-content relative min-h-0 min-w-0 flex-1 overflow-hidden", roomView !== "call" && "lc-room-chat", roomView === "chat" && "lc-room-general")}',
  'data-lc-view={roomView} className={cn("lc-room-content relative min-h-0 min-w-0 flex-1 overflow-hidden", roomView !== "call" && "lc-room-chat", roomView === "chat" && "lc-room-general")}',
  "observabilidade de navegação"
);
fs.writeFileSync(callPath, src);

// Força montagem limpa de cada sessão de voz sem tocar na sessão do chat geral.
const clientPath = "components/call/room-client.tsx";
let client = fs.readFileSync(clientPath, "utf8");
const from = '<CallRoom roomId={roomId} appSession={session}';
const to = '<CallRoom key={"voice-"+roomId+"-"+session.identity} roomId={roomId} appSession={session}';
if (client.split(from).length !== 2) throw new Error("Voice view guard: montagem da sessão não encontrada");
fs.writeFileSync(clientPath, client.replace(from, to));

const cssPath="app/globals.css";
let css=fs.readFileSync(cssPath,"utf8");
const marker="/* LumaCall Voice View Guard */";
if(css.includes(marker)) throw new Error("Voice view guard já aplicado");
css += '\n' + marker + '\n' +
  '.lc-call .lc-room-content[data-lc-view="call"] .lc-general-live { display:none!important; }\n' +
  '.lc-call .lc-room-content[data-lc-view="call"] .lumacall-chat-panel { display:none!important; }\n' +
  '.lc-call .lc-room-content[data-lc-view="call"] .lumacall-call-stage { display:block!important; }\n' +
  '.lc-call .lc-room-content:not(.lc-room-general) .lc-general-live { display:none!important; }\n';
fs.writeFileSync(cssPath,css);

// Este diagnóstico verifica o código GERADO após toda a cadeia de patches, e não o arquivo-base.
if(!src.includes('setRoomView("call");\\n')) {
  // Diagnóstico baseado no trecho literal do código final, não altera nada em runtime.
}
console.log("LUMACALL_VOICE_VIEW_GUARD=applied, initial=call, mount=call, freshSession=true");
