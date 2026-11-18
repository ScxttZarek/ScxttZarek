// Automated regression checks for the code paths with the highest potential harm.
// Static source guards complement, but do not replace, API, database and browser tests.
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const code=(p)=>fs.readFileSync(path.join(root,p),"utf8");

test("build runs regression tests before compiling",()=>{
 const p=JSON.parse(code("package.json"));
 assert.match(p.scripts.build,/npm run test\s*&&\s*next build/);
 assert.match(p.scripts.test,/node --test/);
});
test("deleting or updating a role cannot change the permissions of a superior holder",()=>{
 const s=code("v3/roles-route.ts");
 assert.match(s,/async function hasProtectedHolder/);
 assert.match(s,/m\.role='owner'/);
 assert.match(s,/a\.user_id=\$3/);
 assert.match(s,/a\.rank/);
 assert.equal((s.match(/await hasProtectedHolder\(b\.serverId,b\.roleId,u\.id,a\.rank\)/g)||[]).length,2);
 assert.match(s,/function canCreate[\s\S]*p\.rank<a\.rank/);
});
test("moderation removes kicked or banned live participants and warns if removal fails",()=>{
 const route=code("v3/moderation-route.ts");
 assert.match(route,/removeParticipant\(/);
 assert.match(route,/listRooms\(/);
 assert.match(route,/revokeTokenTs/);
 assert.match(route,/disconnected:false/);
 const panel=code("v3/community-panel.tsx");
 assert.match(panel,/result\.warning/);
});
test("new registrations require longer secrets, existing accounts remain compatible",()=>{
 const auth=code("v2/auth-route.ts");
 assert.match(auth,/body\.action==="register"[\s\S]*secret\.length<8/);
 assert.match(auth,/body\.action==="login"/);
 const app=code("v2/nova-app.tsx");
 assert.match(app,/authMode==="register"\?8:4/);
});
test("profile updates validate everything before the atomic SQL UPDATE",()=>{
 const route=code("v2/profile-route.ts");
 assert.match(route,/const assignments:string\[\]=\[\]/);
 assert.match(route,/UPDATE v2_users SET.*assignments\.join/);
 assert.match(route,/Object\.prototype\.hasOwnProperty\.call\(body,"bio"\)/);
 const i=route.indexOf("if(assignments.length)");
 assert.ok(i>route.indexOf("if(Object.prototype.hasOwnProperty.call(body,\"presence\"))"));
});
test("no busy state is set before rejecting an empty channel selection",()=>{
 const app=code("v2/nova-app.tsx");
 assert.match(app,/async function send\(e:FormEvent\)\{e\.preventDefault\(\);if\(!selected\|\|!textChannelId\|\|!draft\.trim\(\)\|\|busy\)return/);
});
test("new channel messages and voice tokens use channel-granular authorization",()=>{
 const m=code("v3/messages-route.ts"),v=code("v3/voice-route.ts");
 assert.match(m,/v3_can_read_channel/);
 assert.match(v,/v3_can_read_channel/);
 assert.match(v,/ttl:"10m"/);
});
