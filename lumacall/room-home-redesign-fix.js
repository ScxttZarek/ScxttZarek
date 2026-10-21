const fs=require("fs");
const files=[["luma-room-home.tsx","components/home/home-client.tsx"],["luma-room-brand.tsx","components/ui/brand.tsx"]];
for(const [from,to] of files){if(!fs.existsSync(to))throw new Error("Destino ausente: "+to);fs.copyFileSync(from,to);}
