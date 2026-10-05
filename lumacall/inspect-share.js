const fs = require("fs");
for (const path of [
  "components/call/call-room.tsx",
  "components/call/settings-modal.tsx",
  "components/call/control-bar.tsx",
  "lib/constants.ts",
  "types/call.ts"
]) {
  if (!fs.existsSync(path)) continue;
  const src = fs.readFileSync(path, "utf8");
  const lines = src.split("\n").filter((line) =>
    /screen|share|quality|fps|resolution|capture|video|setScreenShareEnabled|setScreenShare/i.test(line)
  );
  console.log("SHARE_INSPECT " + path + "=" + JSON.stringify(lines));
}
