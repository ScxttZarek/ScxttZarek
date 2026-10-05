const fs = require("fs");
function emit(path, marker, size=7000) {
  const src = fs.readFileSync(path, "utf8");
  const i = src.indexOf(marker);
  console.log("SHARE_BLOCK " + path + "=" + JSON.stringify(i >= 0 ? src.slice(i, i + size) : "NOT_FOUND"));
}
emit("components/call/call-room.tsx", "  async function toggleScreen()", 8000);
emit("components/call/settings-modal.tsx", '<SettingsSection icon={<MonitorUp', 7000);
emit("types/call.ts", "export type ShareQuality", 1500);
