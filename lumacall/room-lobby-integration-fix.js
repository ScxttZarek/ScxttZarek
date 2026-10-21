const fs=require("fs");
for(const [from,to] of [
["luma-room-client.tsx","components/call/room-client.tsx"],
["luma-general-chat.tsx","components/call/luma-general-chat.tsx"],
["luma-lobby-token-route.ts","app/api/livekit/lobby-token/route.ts"]]){
  fs.mkdirSync(require("path").dirname(to),{recursive:true});
  fs.copyFileSync(from,to);
}
const roomPath="components/call/call-room.tsx";
let src=fs.readFileSync(roomPath,"utf8");
function replace(from,to,label){if(src.split(from).length!==2)throw Error("Lobby integration "+label+" anchor missing");src=src.replace(from,to);}
replace('  const [chatOpen, setChatOpen] = useState(true);','  const [chatOpen, setChatOpen] = useState(false);',"chat initial");
replace('  const [roomView, setRoomView] = useState<"chat" | "call">("chat");','  const [roomView, setRoomView] = useState<"chat" | "call" | "callChat">("chat");',"view state");
replace('export function CallRoom({ roomId, appSession, onSessionChange, onLeave }: { roomId: string; appSession: AppSession; onSessionChange: (session: AppSession) => void; onLeave: () => void }) {',
 'export function CallRoom({ roomId, appSession, onSessionChange, onLeave, generalChatNode }: { roomId: string; appSession: AppSession; onSessionChange: (session: AppSession) => void; onLeave: () => void; generalChatNode: React.ReactNode }) {',"props");
replace('onClick={() => { setRoomView("chat"); setChatOpen(true); setParticipantsOpen(false); }}',
 'onClick={() => { setRoomView("chat"); setChatOpen(false); setParticipantsOpen(false); }}',"general sidebar");
replace('          <div className="mt-2 space-y-0.5 pl-2">',
 '          <button type="button" onClick={() => {setRoomView("callChat");setChatOpen(true);setParticipantsOpen(false);}} className={cn("lc-sidebar-entry mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold",roomView==="callChat"?"lc-selected":"text-zinc-400")}><MessageCircle className="size-4 shrink-0"/>Chat da chamada</button>\n          <div className="mt-2 space-y-0.5 pl-2">',"sidebar call chat");
replace('roomView === "chat" && "lc-room-chat"',
 'roomView !== "call" && "lc-room-chat", roomView === "chat" && "lc-room-general"',"content class");
replace('roomView === "chat" && <div className="lc-chat-channel-heading',
 'roomView !== "call" && <div className="lc-chat-channel-heading',"header conditional");
replace('<Hash className="size-4 text-zinc-500" /> geral <span className="ml-2 font-normal text-zinc-500">Converse com a sala</span>',
 '<Hash className="size-4 text-zinc-500" /> {roomView==="chat"?"geral":"chat da chamada"} <span className="ml-2 font-normal text-zinc-500">{roomView==="chat"?"Converse com toda a sala":"Converse com quem está na call"}</span>',"header content");
replace('roomView === "chat" && "hidden"', 'roomView !== "call" && "hidden"',"stage");
replace('      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} onUnread={unreadChanged} />',
 '      <div className={cn("lc-general-live",roomView==="chat"?"lc-general-visible":"hidden")}>{generalChatNode}</div>\n      <ChatPanel open={chatOpen} onClose={() => {setChatOpen(false);setRoomView("call");}} onUnread={unreadChanged} />',"lobby overlay");
replace('onChat={() => { setParticipantsOpen(false); setRoomView("chat"); setChatOpen(true); }}',
 'onChat={() => { setParticipantsOpen(false); setRoomView("callChat"); setChatOpen(true); }}',"chat button");
fs.writeFileSync(roomPath,src);
const cssPath="app/globals.css";
let css=fs.readFileSync(cssPath,"utf8");
if(!css.includes("/* LumaCall Lobby Chat */"))fs.writeFileSync(cssPath,css+fs.readFileSync("luma-lobby.css","utf8"));
