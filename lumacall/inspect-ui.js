const fs = require("fs");
for (const path of [
  "components/call/chat-panel.tsx",
  "components/call/call-room.tsx",
  "components/call/participant-tile.tsx",
  "components/home/home-client.tsx"
]) {
  console.log("\n===== INSPECT " + path + " =====");
  console.log(fs.readFileSync(path, "utf8"));
  console.log("===== END " + path + " =====\n");
}
