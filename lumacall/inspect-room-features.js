const fs = require("fs");
const paths = [
  "lib/livekit/app-session.ts",
  "lib/validation.ts",
  "types/call.ts",
  "components/call/room-client.tsx",
  "app/sala/[roomId]/page.tsx"
];
for (const path of paths) {
  if (!fs.existsSync(path)) continue;
  const src = fs.readFileSync(path, "utf8");
  console.log("SMALLFILE|" + path + "|" + JSON.stringify(src));
}