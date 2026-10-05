const fs = require("fs");
for (const path of ["components/call/control-bar.tsx","components/call/chat-panel.tsx"]) {
  const src = fs.readFileSync(path, "utf8");
  const needles = path.includes("control-bar") ? ["unread", "MessageSquare"] : ["onUnread", "chatMessages"];
  for (const n of needles) {
    const i = src.indexOf(n);
    console.log("REL|" + path + "|" + n + "|" + JSON.stringify(i >= 0 ? src.slice(Math.max(0,i-900),i+1800) : ""));
  }
}