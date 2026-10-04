const fs = require("fs");

for (const path of [
  "components/call/pre-join.tsx",
  "components/call/room-client.tsx",
  "components/call/call-room.tsx",
  "components/call/control-bar.tsx",
  "components/call/chat-panel.tsx",
  "components/call/participants-panel.tsx",
  "components/home/home-client.tsx"
]) {
  const lines = fs.readFileSync(path, "utf8").split("\n")
    .filter((line) => line.includes("className") || line.includes("<MobileGate"));
  console.log("LINES " + path + "=" + JSON.stringify(lines));
}

const css = fs.readFileSync("app/globals.css", "utf8").split("\n");
console.log("CSS_MEDIA=" + JSON.stringify(css.filter((line) =>
  line.includes("@media") ||
  line.includes("mobile-gate") ||
  line.includes("desktop-app") ||
  line.includes("max-width") ||
  line.includes("min-width")
)));
