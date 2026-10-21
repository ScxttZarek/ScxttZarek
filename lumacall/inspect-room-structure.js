const fs = require("fs");
const targets = [
["HOME","components/home/home-client.tsx",24000],
["PREJOIN","components/call/pre-join.tsx",17000],
["ROOM","components/call/call-room.tsx",32000],
["ROOMCLIENT","components/call/room-client.tsx",14000],
["CHAT","components/call/chat-panel.tsx",16000],
["PANEL","components/call/participants-panel.tsx",17000],
["TILE","components/call/participant-tile.tsx",18000],
["BRAND","components/ui/brand.tsx",10000],
["GLOBALS","app/globals.css",7000]
];
for (const [id,path,limit] of targets) {
  const src=fs.readFileSync(path,"utf8").slice(0,limit);
  for(let i=0;i<src.length;i+=1000) console.log("LUMA2_"+id+"_"+(i/1000)+"="+JSON.stringify(src.slice(i,i+1000)));
}