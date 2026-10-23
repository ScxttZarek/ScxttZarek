const fs=require("fs");
const path="app/page.tsx";
if(!fs.existsSync("components/v2/nova-app.tsx"))throw Error("V2 missing");
fs.writeFileSync(path,'import "./nova/v2.css";\nimport { NovaApp } from "@/components/v2/nova-app";\nexport const metadata={title:"LumaCall — Sua comunidade AllBlack",description:"Crie sua conta e seus próprios servidores privados no LumaCall."};\nexport default function Page(){return <NovaApp/>;}\n');
console.log("LUMACALL_V2_HOME=active; no automatic server creation");
