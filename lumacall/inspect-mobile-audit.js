const fs=require("fs");
const paths=[
"app/globals.css",
"components/call/call-room.tsx",
"components/call/control-bar.tsx",
"components/call/chat-panel.tsx",
"components/call/participants-panel.tsx",
"components/call/settings-modal.tsx",
"components/call/pre-join.tsx",
"components/ui/mobile-gate.tsx",
"components/home/home-client.tsx"
];
for(const p of paths){if(!fs.existsSync(p))continue;const s=fs.readFileSync(p,"utf8");for(let i=0;i<s.length;i+=2000)console.log("MOBILEAUDIT|"+p+"|"+i+"|"+JSON.stringify(s.slice(i,i+2000)));}