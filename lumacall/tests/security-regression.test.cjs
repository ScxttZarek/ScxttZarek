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

test("a private channel can never be declassified by PATCH, even if initially empty",()=>{
 const s=code("v3/channels-route.ts");
 assert.match(s,/c\\.is_private&&b\\.isPrivate===false/);
 assert.match(s,/Crie um novo canal público/);
 assert.doesNotMatch(s,/if\\(history\\.length\\)/);
});
test("channel message mutations recheck authorization in their writing SQL statement",()=>{
 const s=code("v3/messages-route.ts");
 assert.match(s,/INSERT INTO v2_messages\\(server_id,channel_id,user_id,content\\)/);
 assert.match(s,/SELECT c\\.server_id,c\\.id,\\$2::uuid,\\$3::text FROM v3_channels/);
 assert.match(s,/AND v3_can_read_channel\\(c\\.id,\\$2::uuid\\) RETURNING id::text/);
 assert.match(s,/v3_can_read_channel\\(c\\.id,\\$3::uuid\\)/);
 assert.match(s,/v3_user_permission\\(server_id,\\$2::uuid,'messages'\\)/);
 assert.match(s,/if\\(!changed\\.length\\)return asJson/);
});
test("invisible peer presence is never exposed in direct-message thread lists",()=>{
 const s=code("v3/dm-route.ts");
 assert.match(s,/CASE WHEN u\.presence='invisible' THEN 'offline'/);
});
test("switching voice channels discards stale LiveKit tokens",()=>{
 const s=code("v2/nova-app.tsx");
 assert.match(s,/if\(voice&&voice\.channelId!==c\.id\)setVoice\(null\)/);
});

test("channel message pagination uses a validated keyset cursor and scoped reactions",()=>{
 const s=code("v3/messages-route.ts");
 assert.match(s,/params\.get\("before"\)/);
 assert.match(s,/BigInt\(before\)>BigInt\("9223372036854775807"\)/);
 assert.match(s,/x\.id<\$2::bigint/);
 assert.match(s,/LIMIT 101/);
 assert.match(s,/nextCursor:hasMore\?first:null/);
 assert.match(s,/r\.message_id BETWEEN \$2::bigint AND \$3::bigint/);
});
test("chat UI can load earlier pages without losing its scroll position",()=>{
 const s=code("v2/nova-app.tsx");
 assert.match(s,/async function loadOlderMessages/);
 assert.match(s,/mergeChatMessages\(previous,result\.messages\)/);
 assert.match(s,/el\.scrollTop=saved\.top\+el\.scrollHeight-saved\.height/);
 assert.match(s,/Carregar mensagens anteriores/);
});

test("private-message pagination keeps thread-level authorization and validates cursor",()=>{
 const route=code("v3/dm-route.ts");
 assert.match(route,/threadFor\(threadId,user\.id\)/);
 assert.match(route,/params\.get\("before"\)/);
 assert.match(route,/id<\$2::bigint/);
 assert.match(route,/nextCursor:hasMore\?messages\[0\]\?\.id:null/);
});
test("DM timeline merges historical pages while preserving scroll and newer updates",()=>{
 const ui=code("v3/dm-panel.tsx");
 assert.match(ui,/async function loadOlder\(/);
 assert.match(ui,/mergeDM\(previous,data\.messages\)/);
 assert.match(ui,/mergeDM\(previous,result\.messages\)/);
 assert.match(ui,/el\.scrollTop=saved\.top\+el\.scrollHeight-saved\.height/);
});
