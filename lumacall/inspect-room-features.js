const fs = require("fs");
const specs = {
  "app/api/livekit/token/route.ts": [0,1400,2800,4200],
  "app/api/livekit/moderate/route.ts": [0,1400,2800,4200],
  "components/call/control-bar.tsx": [0,1400,2800,4200]
};
for (const [path, starts] of Object.entries(specs)) {
  const src = fs.readFileSync(path, "utf8");
  for (const i of starts) console.log("FINALCUT|" + path + "|" + i + "|" + JSON.stringify(src.slice(i,i+1400)));
}