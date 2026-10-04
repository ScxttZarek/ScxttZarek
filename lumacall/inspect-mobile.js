const fs = require("fs");
const paths = [
  "components/ui/mobile-gate.tsx",
  "components/call/call-room.tsx",
  "components/call/control-bar.tsx",
  "components/call/pre-join.tsx",
  "components/call/room-client.tsx",
  "components/call/chat-panel.tsx",
  "components/call/participants-panel.tsx",
  "components/home/home-client.tsx",
  "app/globals.css"
];

for (const path of paths) {
  if (!fs.existsSync(path)) {
    console.log("MISSING=" + path);
    continue;
  }
  console.log("FILE=" + path + "\n" + JSON.stringify(fs.readFileSync(path, "utf8")));
}
