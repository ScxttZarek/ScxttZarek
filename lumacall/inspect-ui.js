const fs = require("fs");
for (const path of ["components/call/chat-panel.tsx", "components/call/call-room.tsx", "components/home/home-client.tsx"]) {
  const source = fs.readFileSync(path, "utf8");
  console.log("===== FILE " + path + " =====");
  for (let i = 0; i < source.length; i += 3500) {
    console.log("CHUNK " + (i / 3500 + 1) + "\n" + source.slice(i, i + 3500));
  }
  console.log("===== END =====");
}
