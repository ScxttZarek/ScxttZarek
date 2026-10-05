const fs = require("fs");
const paths = [
  "components/call/call-room.tsx",
  "components/call/control-bar.tsx",
  "components/call/chat-panel.tsx",
  "components/call/participants-panel.tsx",
  "app/api/livekit/token/route.ts",
  "app/api/livekit/moderate/route.ts",
  "app/api/livekit/host/claim/route.ts",
  "lib/livekit/server.ts",
  "lib/livekit/app-session.ts",
  "lib/validation.ts",
  "types/call.ts",
  "components/call/room-client.tsx",
  "app/sala/[roomId]/page.tsx"
];
for (const path of paths) {
  if (!fs.existsSync(path)) continue;
  const src = fs.readFileSync(path, "utf8");
  for (let i = 0; i < src.length; i += 2200) {
    console.log("FCHUNK|" + path + "|" + i + "|" + JSON.stringify(src.slice(i, i + 2200)));
  }
}