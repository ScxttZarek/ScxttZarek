const fs=require("fs");
for (const [id,path,limit] of [
["HOME","components/home/home-client.tsx",20000],
["PREJOIN","components/call/pre-join.tsx",16000],
["ROOM","components/call/call-room.tsx",23000],
["ROOMCLIENT","components/call/room-client.tsx",11000],
["CHAT","components/call/chat-panel.tsx",18000],
["PANEL","components/call/participants-panel.tsx",12000],
["BRAND","components/ui/brand.tsx",5000],
["TILE","components/call/participant-tile.tsx",14000]
]) {
const src=fs.readFileSync(path,"utf8");
console.log("LUMA_INSPECT_"+id+"="+JSON.stringify(src.slice(0,limit)));
}