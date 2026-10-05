const fs = require("fs");

function around(path, marker, before=400, after=2200) {
  const src = fs.readFileSync(path, "utf8");
  const i = src.indexOf(marker);
  console.log("PROFILE_SNIP " + path + " " + marker + "=" + JSON.stringify(i >= 0 ? src.slice(Math.max(0, i-before), i+after) : "NOT_FOUND"));
}

around("components/call/participant-tile.tsx", "cameraActive ?", 300, 2600);
around("components/call/participant-tile.tsx", "participant.name ||", 500, 1900);
around("components/call/participants-panel.tsx", "participants.map", 200, 2600);
around("components/call/chat-panel.tsx", "chatMessages.map", 200, 3300);
