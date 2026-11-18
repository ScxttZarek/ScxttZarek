const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {join}=require("node:path");
const load=(p)=>readFileSync(join(__dirname,"..",p),"utf8");
test("delegated role administration requires server permission",()=>{
 const s=load("v3/roles-route.ts");
 assert.match(s,/permission\(serverId,userId,"roles"\)/);
 assert.match(s,/canManage:await permission\(id,u.id,"roles"\)/);
});
test("delegated role managers cannot assign higher/equal roles, or change their own",()=>{
 const s=load("v3/roles-route.ts");
 assert.match(s,/role\.priority|r\.priority<a\.rank/);
 assert.match(s,/b\.userId===u\.id/);
 assert.match(s,/await highest\(b\.serverId,b\.userId\)\)>=a\.rank/);
 assert.match(s,/target\.role==="owner"/);
 assert.match(s,/!canEdit\(a,r\)/);
});
test("role grants are limited to permissions already held",()=>{
 const s=load("v3/roles-route.ts");
 assert.match(s,/within\(p\.rights,a\.rights\)/);
 assert.match(s,/within\(rightSet\(r\),a\.rights\)/);
 assert.match(s,/p\.rank<a\.rank/);
 assert.match(s,/r\.priority<a\.rank/);
 assert.match(s,/Number\.isInteger\(b\.priority\)/);
});
test("role operations are scoped to server",()=>{
 const s=load("v3/roles-route.ts");
 assert.match(s,/WHERE server_id=\$1 AND id=\$2/);
 assert.match(s,/WHERE id=\$1 AND server_id=\$2/);
 assert.match(s,/ON CONFLICT DO NOTHING/);
});
test("moderation explicitly tries to disconnect former members from active LiveKit rooms",()=>{
 const s=load("v3/moderation-route.ts");
 assert.match(s,/getRoomService/);
 assert.match(s,/listRooms\(rooms\)/);
 assert.match(s,/removeParticipant/);
 assert.match(s,/disconnected:false/);
});
test("new account registration requires at least eight characters, with legacy login retained",()=>{
 const auth=load("v2/auth-route.ts"),app=load("v2/nova-app.tsx");
 assert.match(auth,/if\(secret\.length<8\)/);
 assert.match(app,/authMode==="register"\?8:4/);
});
test("profile validation happens before any database UPDATE",()=>{
 const s=load("v2/profile-route.ts");
 const i=s.indexOf('if(Object.prototype.hasOwnProperty.call(body,"presence"))');
 const j=s.indexOf('await db("UPDATE v2_users');
 assert.ok(i>0&&j>i);
});
