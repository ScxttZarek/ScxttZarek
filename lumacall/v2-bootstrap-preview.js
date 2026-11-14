const fs=require("fs"),path=require("path");
const copies=[
["v2/database.ts","lib/v2/database.ts"],
["v3/community.ts","lib/v3/community.ts"],
["v3/channels-route.ts","app/api/v3/channels/route.ts"],
["v3/roles-route.ts","app/api/v3/roles/route.ts"],
["v3/moderation-route.ts","app/api/v3/moderation/route.ts"],
["v3/messages-route.ts","app/api/v3/messages/route.ts"],
["v3/call-messages-route.ts","app/api/v3/call-messages/route.ts"],
["v3/voice-route.ts","app/api/v3/voice/route.ts"],
["v3/dm-route.ts","app/api/v3/dm/route.ts"],
["v3/blocks-route.ts","app/api/v3/blocks/route.ts"],
["v3/security-route.ts","app/api/v3/security/route.ts"],
["v2/auth.ts","lib/v2/auth.ts"],
["v2/health.ts","app/api/v2/health/route.ts"],
["v2/auth-route.ts","app/api/v2/auth/route.ts"],
["v2/profile-route.ts","app/api/v2/profile/route.ts"],
["v2/servers-route.ts","app/api/v2/servers/route.ts"],
["v2/join-route.ts","app/api/v2/servers/join/route.ts"],
["v2/members-route.ts","app/api/v2/members/route.ts"],
["v2/messages-route.ts","app/api/v2/messages/route.ts"],
["v2/voice-route.ts","app/api/v2/voice/route.ts"],
["v2/voice.tsx","components/v2/voice.tsx"],
["v2/install-app.tsx","components/v2/install-app.tsx"],
["v2/nova-app.tsx","components/v2/nova-app.tsx"],
["v2/ui-kit.tsx","components/v2/ui-kit.tsx"],
["v2/shell-parts.tsx","components/v2/shell-parts.tsx"],
["v2/v2.css","app/nova/v2.css"],
["v2/call-stage.css","app/nova/call-stage.css"],
["v2/demo-page.tsx","app/nova/demo/page.tsx"]
];
for(const [source,dest] of copies){
  let code=fs.readFileSync(source,"utf8");
  if(dest.startsWith("app/api/")){
    code=code.replaceAll('from "./auth"','from "@/lib/v2/auth"').replaceAll('from "./database"','from "@/lib/v2/database"');
  }
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.writeFileSync(dest,code);
}
fs.writeFileSync("app/nova/page.tsx",'import "./v2.css";\nimport "./call-stage.css";\nimport { NovaApp } from "@/components/v2/nova-app";\nexport const metadata={title:"LumaCall 2.0 — Nova interface"};\nexport default function Page(){return <NovaApp/>;}\n');
console.log("LUMACALL_V2_BOOTSTRAP=installed; route=/nova; main-unchanged");
