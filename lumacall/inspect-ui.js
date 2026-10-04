const fs = require("fs");
const chat = fs.readFileSync("components/call/chat-panel.tsx", "utf8");
const call = fs.readFileSync("components/call/call-room.tsx", "utf8");
const home = fs.readFileSync("components/home/home-client.tsx", "utf8");
const mainStart = call.indexOf("<main className=");
const mainEnd = call.indexOf("</main>", mainStart) + 7;
console.log("CHATJSON=" + JSON.stringify(chat));
console.log("CALLMAINJSON=" + JSON.stringify(call.slice(mainStart, mainEnd)));
console.log("HOMEJSON=" + JSON.stringify(home));
