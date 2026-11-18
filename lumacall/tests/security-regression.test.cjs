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
 assert.ok(s.includes("if(c.is_private&&b.isPrivate===false)"));
 assert.ok(s.includes("Crie um novo canal público"));
 assert.ok(!s.includes("if(history.length)"));
});
test("channel message mutations recheck authorization in their writing SQL statement",()=>{
 const s=code("v3/messages-route.ts");
 for(const fragment of [
  "INSERT INTO v2_messages(server_id,channel_id,user_id,content)",
  "SELECT c.server_id,c.id,$2::uuid,$3::text FROM v3_channels",
  "AND v3_can_read_channel(c.id,$2::uuid) RETURNING id::text",
  "v3_can_read_channel(c.id,$3::uuid)",
  "v3_user_permission(server_id,$2::uuid,'messages')",
  "if(!changed.length)return asJson"
 ])assert.ok(s.includes(fragment),"Missing expected SQL authorization guard: "+fragment);
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

test("call-chat reads and writes recheck channel authorization in their SQL",()=>{
 const s=code("v3/call-messages-route.ts");
 assert.ok(s.includes("INSERT INTO v3_call_messages(server_id,channel_id,user_id,content)"));
 assert.ok(s.includes("SELECT c.server_id,c.id,$2::uuid,$3::text FROM v3_channels"));
 assert.ok(s.includes("c.kind='voice' AND c.archived_at IS NULL"));
 assert.ok(s.includes("AND v3_can_read_channel(c.id,$2::uuid) RETURNING id::text"));
 assert.ok(s.includes("c.id=v3_call_messages.channel_id AND c.kind='voice' AND c.archived_at IS NULL AND v3_can_read_channel(c.id,$3::uuid)"));
});
test("server settings validate all requested changes before one owner-scoped UPDATE",()=>{
 const s=code("v3/server-settings-route.ts").split("export async function POST")[0];
 assert.ok(s.indexOf("if(b.icon!==undefined)")<s.indexOf("const rows=await db"));
 assert.equal(s.split("await db<").length-1,1);
 assert.ok(s.includes("updates.join"));
 assert.ok(s.includes("m.server_id=s.id AND m.user_id="));
 assert.ok(s.includes("if(!rows.length)return asJson"));
});

test("channel history and reactions recheck current channel visibility while reading",()=>{
 const s=code("v3/messages-route.ts");
 assert.ok(s.includes("v3_can_read_channel(x.channel_id,$3::uuid)"));
 assert.ok(s.includes("[id,before,user.id]"));
 assert.ok(s.includes("v3_can_read_channel(m.channel_id,$4::uuid)"));
 assert.ok(s.includes("[id,first,last,user.id]"));
});
test("direct-message write confirms thread membership and absence of bilateral blocks in SQL",()=>{
 const s=code("v3/dm-route.ts");
 assert.ok(s.includes("INSERT INTO v3_dm_messages(thread_id,user_id,content)"));
 assert.ok(s.includes("t.user_a=$2::uuid OR t.user_b=$2::uuid"));
 assert.ok(s.includes("bl.blocker_id=t.user_a AND bl.blocked_id=t.user_b"));
 assert.ok(s.includes("bl.blocker_id=t.user_b AND bl.blocked_id=t.user_a"));
 assert.ok(s.includes("if(!rows[0])return asJson"));
});

test("voice call chat can paginate independently and preserves earlier history on refresh",()=>{
 const api=code("v3/call-messages-route.ts"),ui=code("v3/call-chat-panel.tsx");
 for(const phrase of ['params.get("before")',"LIMIT 101","nextCursor:hasMore?messages[0]?.id:null","v3_can_read_channel(c.id,$3::uuid)"])
  assert.ok(api.includes(phrase),"Call chat missing: "+phrase);
 for(const phrase of ["function mergeCall(","async function loadOlder()","restoreScroll.current=saved","Carregar mensagens anteriores","document.visibilityState"])
  assert.ok(ui.includes(phrase),"Call chat UI missing: "+phrase);
});
test("private channel edit UI matches irreversible server-side privacy policy",()=>{
 const s=code("v3/community-panel.tsx");
 assert.ok(s.includes("disabled={channels.some(c=>c.id===editChannelId&&c.is_private)}"));
 assert.ok(s.includes("um canal privado não pode se tornar público"));
});
test("DM send results cannot merge into a different selected conversation",()=>{
 const s=code("v3/dm-panel.tsx");
 assert.ok(s.includes("const threadId=selected,content=draft.trim()"));
 assert.ok(s.includes("if(selectedRef.current!==threadId)return"));
 assert.ok(s.includes("if(selectedRef.current===threadId)setMessages(previous=>mergeDM"));
});

test("channel and private-message polling pauses in hidden browser tabs and catches up on visibility",()=>{
 const app=code("v2/nova-app.tsx"),dm=code("v3/dm-panel.tsx");
 for(const s of [app,dm]){
  assert.ok(s.includes('document.visibilityState==="visible"'));
  assert.ok(s.includes('document.addEventListener("visibilitychange",refreshVisible)'));
  assert.ok(s.includes('document.removeEventListener("visibilitychange",refreshVisible)'));
 }
});

test("voice token creation rechecks access after the room service request",()=>{
 const route=code("v3/voice-route.ts");
 assert.ok(route.includes("const stillAllowed=await db"));
 assert.ok(route.includes("stillAllowed[0].server_id!==rows[0].server_id"));
 assert.ok(route.indexOf("const stillAllowed=await db")<route.indexOf("const token=new AccessToken"));
 assert.ok(route.includes('ttl:"10m"'));
});
test("navigating away invalidates pending voice joins and stale server calls",()=>{
 const app=code("v2/nova-app.tsx");
 assert.ok(app.includes("voiceJoinRequestRef.current++"));
 assert.ok(app.includes("activeVoiceChannelRef.current=voiceChannelId"));
 assert.ok(app.includes("requestId!==voiceJoinRequestRef.current"));
 assert.ok(app.includes("out.serverId!==serverId"));
 assert.ok(app.includes("setVoice(current=>current?.serverId===serverId"));
});
test("archiving a channel never promises to publish its messages in general chat",()=>{
 const panel=code("v3/community-panel.tsx");
 assert.ok(panel.includes("não será transferido para o canal geral"));
 assert.ok(!panel.includes("As mensagens serão preservadas no canal geral"));
});

test("voice rooms offer explicit audio unlock and do not notify leave twice",()=>{
 const s=code("v2/voice.tsx");
 assert.ok(s.includes("StartAudio"));
 assert.ok(s.includes('label="Ativar áudio da chamada"'));
 assert.ok(s.includes("const leaveNotified=useRef(false)"));
 assert.ok(s.includes("if(leaveNotified.current)return"));
 assert.ok(s.includes("onDisconnected={notifyLeave}"));
 assert.ok(s.includes("onLeave={notifyLeave}"));
 const styles=code("v2/call-stage.css");
 assert.ok(styles.includes(".lc-call-layout .lk-start-audio-button"));
});

test("moderation emits visible warning when LiveKit disconnection is incomplete",()=>{
 const route=code("v3/moderation-route.ts"),panel=code("v3/community-panel.tsx");
 assert.ok(route.includes("if(failedRooms)return {disconnected:false,failedRooms,warning:"));
 assert.ok(panel.includes("result.warning"));
 assert.ok(panel.includes('title="Arquivar canal"'));
});

test("channel privacy updates are atomic and voice archive closes the LiveKit room",()=>{
 const s=code("v3/channels-route.ts");
 assert.ok(s.includes("AND archived_at IS NULL AND (NOT is_private OR coalesce($2::boolean,true))"));
 assert.ok(s.includes('if(!updated[0])return asJson('));
 assert.ok(s.includes('if(rooms.some(room=>room.name===roomName))await client.deleteRoom(roomName)'));
 assert.ok(s.includes('disconnected:false,warning:'));
});

test("channel grant revocation checks effective permissions and evicts unauthorized call participants",()=>{
 const route=code("v3/channels-route.ts");
 assert.ok(route.includes("async function removeUnauthorizedVoiceParticipants(channelId:string)"));
 assert.ok(route.includes("SELECT v3_can_read_channel($1::uuid,$2::uuid) AS allowed"));
 assert.ok(route.includes("revoked.map(p=>client.removeParticipant(roomName,p.identity,{revokeTokenTs}))"));
 assert.ok(route.includes('if(c.kind==="voice"&&!b.enabled)'));
});

test("role removals reconcile effective private voice room permissions",()=>{
 const s=code("v3/roles-route.ts");
 assert.ok(s.includes("async function reconcileRoleVoicePermissions(serverId:string)"));
 assert.ok(s.includes("SELECT v3_can_read_channel($1::uuid,$2::uuid) AS allowed"));
 assert.ok(s.includes("return await reportRoleVoiceCleanup(b.serverId)"));
 assert.ok(s.includes("revoked.map(p=>client.removeParticipant(p.roomName,p.identity,{revokeTokenTs}))"));
});

test("DM conversation opening and CSRF origin checks are scoped to current authorization",()=>{
 const dm=code("v3/dm-route.ts"),auth=code("v2/auth.ts");
 assert.ok(dm.includes("INSERT INTO v3_dm_threads(user_a,user_b)"));
 assert.ok(dm.includes("SELECT $1::uuid,$2::uuid WHERE EXISTS("));
 assert.ok(dm.includes("if(!rows[0])return asJson(\"Conversa indisponível.\",403)"));
 assert.ok(auth.includes("new URL(origin).origin===new URL(request.url).origin"));
});
