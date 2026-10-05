const fs = require("fs");
for (const path of ["components/call/room-client.tsx","components/call/call-room.tsx"]) {
  if (!fs.existsSync(path)) continue;
  const src = fs.readFileSync(path, "utf8");
  const starts = path.includes("room-client") ? [0,1600,3200,4800] : [11800,13600,15400,17200,19000];
  for (const i of starts) console.log("CUT|" + path + "|" + i + "|" + JSON.stringify(src.slice(i,i+1600)));
}