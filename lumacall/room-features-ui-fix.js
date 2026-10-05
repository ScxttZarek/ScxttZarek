const fs = require("fs");

function mustReplace(source, from, to, label) {
  if (!source.includes(from)) throw new Error("Não foi possível aplicar: " + label);
  return source.replace(from, to);
}

{
  const path = "components/call/call-room.tsx";
  let src = fs.readFileSync(path, "utf8");

  src = mustReplace(
    src,
    '  return <div className="mobile-call flex h-full flex-col bg-[#08090b]">',
    '  return <div className="mobile-call relative flex h-full flex-col bg-[#08090b]">',
    "container relativo para reconexão",
  );

  src = mustReplace(
    src,
    '    <RoomAudioRenderer />',
    '    <RoomAudioRenderer />\n    {connectionState === ConnectionState.Reconnecting && <div className="pointer-events-none absolute left-1/2 top-[72px] z-[70] -translate-x-1/2 rounded-xl border border-amber-300/15 bg-[#15130d]/95 px-4 py-2.5 shadow-xl shadow-black/30"><div className="flex items-center gap-2"><span className="size-2 rounded-full bg-amber-300" /><div><p className="text-[11px] font-semibold text-amber-100">Reconectando...</p><p className="text-[9px] text-amber-200/55">Sua chamada será restaurada automaticamente.</p></div></div></div>}',
    "banner de reconexão",
  );

  fs.writeFileSync(path, src);
}

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
