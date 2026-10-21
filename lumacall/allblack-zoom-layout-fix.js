const fs = require("fs");

function replaceExactly(source, from, to, label) {
  if (source.split(from).length !== 2) {
    throw new Error("LumaCall allblack / zoom: âncora ausente ou duplicada: " + label);
  }
  return source.replace(from, to);
}

const callPath = "components/call/call-room.tsx";
let call = fs.readFileSync(callPath, "utf8");

// O nome da call sempre abre a grade de TODOS os participantes.
// Selecionar um nome individual na lateral ainda permite focar aquela pessoa.
call = replaceExactly(call,
  'onClick={() => { setRoomView("call"); setChatOpen(false); setParticipantsOpen(false); }}',
  'onClick={() => { setRoomView("call"); setChatOpen(false); setParticipantsOpen(false); setFocusScreen(false); setFocusParticipantId(null); }}',
  "abrir grade pela chamada"
);

// Sem modal ou confirmação ao desligar, mas mantém confirmação para remover participantes.
call = replaceExactly(call,
  '  const [leaveOpen, setLeaveOpen] = useState(false);\n',
  '',
  "estado de confirmação de saída"
);
call = replaceExactly(call,
  '    setLeaveOpen(false);\n    await room.disconnect();',
  '    await room.disconnect();',
  "sair imediatamente"
);
call = replaceExactly(call,
  'onLeave={() => setLeaveOpen(true)}',
  'onLeave={() => { void leaveRoom(); }}',
  "botão desligar"
);
call = replaceExactly(call,
  '    <ConfirmModal open={leaveOpen} title="Deseja sair da chamada?" description="Você poderá entrar novamente pelo mesmo link enquanto a sala estiver disponível." confirmLabel="Sair" danger onCancel={() => setLeaveOpen(false)} onConfirm={leaveRoom} />\n',
  '',
  "remover modal de saída"
);

// A classe explícita evita que zoom/redimensionamento alterem o foco da grade.
call = replaceExactly(call,
  'className="participant-grid mx-auto grid min-h-full w-full max-w-6xl content-center gap-2 py-1 sm:gap-3" style={{ gridTemplateColumns: \`repeat(\${columns}, minmax(0, 1fr))\` }}',
  'data-focused={focusActive} data-count={tileCount} className="participant-grid mx-auto grid min-h-full w-full max-w-6xl content-center gap-2 py-1 sm:gap-3" style={{ gridTemplateColumns: \`repeat(\${columns}, minmax(0, 1fr))\` }}',
  "marcadores da grade"
);

fs.writeFileSync(callPath, call);

const cssPath = "app/globals.css";
let css = fs.readFileSync(cssPath, "utf8");
const theme = fs.readFileSync("luma-allblack-v2.css", "utf8");
const marker = "/* LumaCall AllBlack v2";
if (!theme.startsWith(marker)) throw new Error("Tema AllBlack inválido");
if (!css.includes(marker)) fs.writeFileSync(cssPath, css + "\n" + theme + "\n");
