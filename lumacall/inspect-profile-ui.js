const fs = require("fs");
for (const path of [
  "components/call/participant-tile.tsx",
  "components/call/participants-panel.tsx",
  "components/call/chat-panel.tsx"
]) {
  const src = fs.readFileSync(path, "utf8");
  console.log("PROFILE_INSPECT " + path + "=" + JSON.stringify(src));
}
