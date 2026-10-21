const fs=require("fs");
const file="components/call/call-room.tsx";
const from='  const [roomView, setRoomView] = useState<"chat" | "call" | "callChat">("chat");';
const to='  const [roomView, setRoomView] = useState<"chat" | "call" | "callChat">("call");';
const src=fs.readFileSync(file,"utf8");
if(src.split(from).length!==2)throw new Error("Call initial view: âncora inesperada, abortando");
fs.writeFileSync(file,src.replace(from,to));
