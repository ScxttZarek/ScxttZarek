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
  "lib/constants.ts"
];
for (const path of paths) {
  if (!fs.existsSync(path)) continue;
  console.log("FEATURE_INSPECT_START " + path);
  console.log(fs.readFileSync(path, "utf8"));
  console.log("FEATURE_INSPECT_END " + path);
}