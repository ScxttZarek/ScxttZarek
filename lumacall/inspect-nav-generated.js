const fs=require("fs");
const file="components/call/call-room.tsx";
const rows=fs.readFileSync(file,"utf8").split("\n");
console.log("LC_NAV_AUDIT_LINES="+rows.length);
const selected=new Set();
for(let i=0;i<rows.length;i++){
const l=rows[i];
if(/export function CallRoom|roomView|chatOpen|leaveRoom|ControlBar|return <div|<ChatPanel|lc-general-live|call-header|lc-rooms-sidebar|lc-room-content|<main className|control-bar|toggleMic|micEnabled|<aside|sidebar-entry/.test(l)){
for(let k=Math.max(0,i-1);k<=Math.min(rows.length-1,i+2);k++)selected.add(k);
}
}
for(const i of [...selected].sort((a,b)=>a-b)){
const value=rows[i].length>1300?rows[i].slice(0,1300)+"…":rows[i];
console.log("LC_AUDIT_"+(i+1)+"="+JSON.stringify(value));
}
