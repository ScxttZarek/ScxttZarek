const fs=require("fs");
const path=require("path");
for (const [source,dest] of [
  ["luma-device-access.tsx","components/ui/device-access.tsx"],
  ["luma-room-client.tsx","components/call/room-client.tsx"],
  ["luma-room-home.tsx","components/home/home-client.tsx"]
]) {
  if(!fs.existsSync(source))throw new Error("Instant call: fonte ausente: "+source);
  if(!fs.existsSync(path.dirname(dest)))fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.copyFileSync(source,dest);
}
