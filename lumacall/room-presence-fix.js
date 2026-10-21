const fs=require("fs");
const path=require("path");
const to="app/api/livekit/call-presence/route.ts";
fs.mkdirSync(path.dirname(to),{recursive:true});
fs.copyFileSync("luma-call-presence-route.ts",to);
