// Executable route-contract tests. No production DB or user accounts are touched.
// We transpile the real TypeScript handlers and inject deterministic dependency
// fakes; unlike source-pattern tests these assert actual HTTP behavior and SQL args.
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const ts=require("typescript");

const root=path.resolve(__dirname,"..");
const user={id:"00000000-0000-4000-8000-000000000001",name:"Test user"};
const channelId="00000000-0000-4000-8000-000000000002";
const threadId="00000000-0000-4000-8000-000000000003";
function makeRoute(relativePath,{getUser=async()=>user,respond=async()=>[],mutation=()=>null,modules={},env={}}={}){
 const source=fs.readFileSync(path.join(root,relativePath),"utf8");
 const js=ts.transpileModule(source,{fileName:relativePath,compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2019,esModuleInterop:true
 }}).outputText;
 const calls=[];
 const api={
  db:async(sql,args)=>{calls.push({sql,args});return respond(sql,args);},
  getUser,
  asJson:(error,status=400)=>Response.json({error},{status}),
  isUuid:(value)=>typeof value==="string"&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value),
  mutation,
  json:(value)=>Response.json(value),
  member:async(_serverId,userId)=>({role:userId===user.id?"owner":"member"}),
  permission:async()=>true,
  textValue:(value,max)=>typeof value==="string"?value.trim().slice(0,max):""
 };
 const module={exports:{}};
 vm.runInNewContext(js,{module,exports:module.exports,require:(moduleName)=>{
  if(moduleName==="@/lib/v3/community")return api;
  if(Object.prototype.hasOwnProperty.call(modules,moduleName))return modules[moduleName];
  throw Error("Unexpected dependency: "+moduleName);
 },URL,Response,BigInt,console,process:{env}},{filename:relativePath,timeout:2000});
 return {handlers:module.exports,calls};
}
function request(path,method="GET",body=undefined){
 const init={method};
 if(body!==undefined){init.headers={"content-type":"application/json"};init.body=JSON.stringify(body);}
 return new Request("https://test.local"+path,init);
}
async function result(response){return {status:response.status,body:await response.json()};}

test("call chat GET rejects unauthenticated users without querying history",async()=>{
 const h=makeRoute("v3/call-messages-route.ts",{getUser:async()=>null});
 const r=await result(await h.handlers.GET(request("/api/v3/call-messages?channelId="+channelId)));
 assert.equal(r.status,401);assert.equal(h.calls.length,0);
});
test("call chat GET rejects malformed, negative, and overflowing history cursors",async()=>{
 const h=makeRoute("v3/call-messages-route.ts");
 for(const cursor of ["bad","-1","0","9223372036854775808","1.0"]){
  const r=await result(await h.handlers.GET(request("/api/v3/call-messages?channelId="+channelId+"&before="+encodeURIComponent(cursor))));
  assert.equal(r.status,400,"cursor "+cursor);
 }
 assert.equal(h.calls.length,0);
});
test("call chat GET rejects access when voice channel is no longer available",async()=>{
 const h=makeRoute("v3/call-messages-route.ts",{respond:async()=>[]});
 const r=await result(await h.handlers.GET(request("/api/v3/call-messages?channelId="+channelId)));
 assert.equal(r.status,403);
 assert.equal(h.calls.length,1);
});
test("call chat GET returns 100 newest records plus stable pagination cursor",async()=>{
 const history=Array.from({length:101},(_,i)=>({id:String(i+1),content:"Message "+(i+1),name:"Tester"}));
 const h=makeRoute("v3/call-messages-route.ts",{respond:async sql=>{
  if(sql.startsWith("SELECT 1 FROM v3_channels"))return [{allowed:true}];
  if(sql.includes("FROM (SELECT * FROM v3_call_messages"))return history;
  throw Error("Unexpected SQL: "+sql);
 }});
 const r=await result(await h.handlers.GET(request("/api/v3/call-messages?channelId="+channelId+"&before=900")));
 assert.equal(r.status,200);assert.equal(r.body.messages.length,100);
 assert.equal(r.body.messages[0].id,"2");assert.equal(r.body.messages[99].id,"101");
 assert.equal(r.body.nextCursor,"2");
 assert.deepEqual(Array.from(h.calls[1].args),[channelId,"900",user.id]);
 assert.match(h.calls[1].sql,/v3_can_read_channel/);
});
test("call chat POST refuses unauthorized writes instead of reporting false success",async()=>{
 const h=makeRoute("v3/call-messages-route.ts",{respond:async()=>[]});
 const r=await result(await h.handlers.POST(request("/api/v3/call-messages","POST",{channelId,content:"Hello"})));
 assert.equal(r.status,403);assert.equal(h.calls.length,1);
 assert.match(h.calls[0].sql,/INSERT INTO v3_call_messages/);
 assert.match(h.calls[0].sql,/v3_can_read_channel/);
});
test("call chat POST returns inserted id and normalizes message text",async()=>{
 const h=makeRoute("v3/call-messages-route.ts",{respond:async()=>[{id:"442"}]});
 const r=await result(await h.handlers.POST(request("/api/v3/call-messages","POST",{channelId,content:"  hello  "})));
 assert.equal(r.status,200);assert.equal(r.body.id,"442");
 assert.deepEqual(Array.from(h.calls[0].args),[channelId,user.id,"hello"]);
});
test("DM POST refuses writes when thread access or blocking changes before INSERT",async()=>{
 const h=makeRoute("v3/dm-route.ts",{respond:async sql=>{
  if(sql.includes("SELECT user_a,user_b"))return [{user_a:user.id,user_b:"00000000-0000-4000-8000-000000000004"}];
  if(sql.startsWith("SELECT 1 FROM v3_blocks"))return [];
  if(sql.startsWith("INSERT INTO v3_dm_messages"))return [];
  throw Error("Unexpected SQL: "+sql);
 }});
 const r=await result(await h.handlers.POST(request("/api/v3/dm","POST",{threadId,content:"A private message"})));
 assert.equal(r.status,403);
 const write=h.calls.find(x=>x.sql.includes("INSERT INTO v3_dm_messages"));
 assert.ok(write);assert.match(write.sql,/NOT EXISTS/);assert.match(write.sql,/v3_blocks/);
});
test("DM POST accepts authorized thread message and returns a primitive id",async()=>{
 const h=makeRoute("v3/dm-route.ts",{respond:async sql=>{
  if(sql.includes("SELECT user_a,user_b"))return [{user_a:user.id,user_b:"00000000-0000-4000-8000-000000000004"}];
  if(sql.startsWith("SELECT 1 FROM v3_blocks"))return [];
  if(sql.startsWith("INSERT INTO v3_dm_messages"))return [{id:"512"}];
  throw Error("Unexpected SQL: "+sql);
 }});
 const r=await result(await h.handlers.POST(request("/api/v3/dm","POST",{threadId,content:"  hello  "})));
 assert.equal(r.status,200);assert.equal(r.body.id,"512");
 const write=h.calls.find(x=>x.sql.includes("INSERT INTO v3_dm_messages"));
 assert.deepEqual(Array.from(write.args),[threadId,user.id,"hello"]);
});

function fakeVoice({permissions=[[{server_id:channelId}],[{server_id:channelId}]],createFails=false,roomExists=true}={}){
 const calls={room:[],tokens:[],signed:0};let check=0;
 const service={
  createRoom:async options=>{calls.room.push(options);if(createFails)throw Error("already exists");},
  listRooms:async names=>roomExists?names.map(name=>({name})):[]
 };
 class AccessToken{
  constructor(key,secret,opts){calls.tokens.push({key,secret,opts});}
  addGrant(value){calls.tokens[calls.tokens.length-1].grant=value;}
  async toJwt(){calls.signed++;return "test-only-token";}
 }
 const harness=makeRoute("v3/voice-route.ts",{
  respond:async sql=>{
   if(!sql.startsWith("SELECT server_id FROM v3_channels"))throw Error("Unexpected SQL: "+sql);
   return permissions[check++]||[];
  },
  modules:{
   "livekit-server-sdk":{AccessToken},
   "@/lib/livekit/server":{getRoomService:()=>service,getLiveKitWsUrl:()=>"wss://example.invalid"}
  },env:{LIVEKIT_API_KEY:"test-key",LIVEKIT_API_SECRET:"test-secret"}
 });
 return {...harness,service,calls,sqlCalls:harness.calls};
}
test("voice route denies access without creating a LiveKit room",async()=>{
 const h=fakeVoice({permissions:[[]]});
 const r=await result(await h.handlers.POST(request("/api/v3/voice","POST",{channelId})));
 assert.equal(r.status,403);assert.equal(h.calls.room.length,0);assert.equal(h.calls.tokens.length,0);
});
test("voice route refuses a token when membership is revoked during room creation",async()=>{
 const h=fakeVoice({permissions:[[{server_id:channelId}],[]]});
 const r=await result(await h.handlers.POST(request("/api/v3/voice","POST",{channelId})));
 assert.equal(r.status,403);assert.equal(h.calls.room.length,1);assert.equal(h.calls.tokens.length,0);
 assert.equal(h.sqlCalls.length,2);
});
test("voice route grants only the selected room with six-person limit and 10-minute TTL",async()=>{
 const h=fakeVoice();
 const r=await result(await h.handlers.POST(request("/api/v3/voice","POST",{channelId})));
 assert.equal(r.status,200);assert.equal(r.body.token,"test-only-token");
 assert.equal(r.body.serverId,channelId);assert.equal(h.calls.room[0].maxParticipants,6);
 assert.equal(h.calls.tokens[0].opts.ttl,"10m");
 assert.equal(h.calls.tokens[0].grant.room,"v3-"+channelId);
 assert.equal(h.calls.tokens[0].grant.roomJoin,true);assert.equal(h.calls.signed,1);
});
test("existing LiveKit rooms are reused, but missing rooms fail closed",async()=>{
 const allowed=fakeVoice({createFails:true,roomExists:true});
 const ok=await result(await allowed.handlers.POST(request("/api/v3/voice","POST",{channelId})));
 assert.equal(ok.status,200);
 const denied=fakeVoice({createFails:true,roomExists:false});
 const failure=await result(await denied.handlers.POST(request("/api/v3/voice","POST",{channelId})));
 assert.equal(failure.status,503);assert.equal(denied.calls.signed,0);
});

function moderationHarness({failRemoval=false,failListing=false,active=true}={}){
 const peer="00000000-0000-4000-8000-000000000004";
 const voiceChannel="00000000-0000-4000-8000-000000000005";
 const operations={removed:[],rooms:[],mutation:0};
 const service={
  listRooms:async names=>{
   operations.rooms.push(names);
   if(failListing)throw Error("room service unavailable");
   return active?[{name:"v3-"+voiceChannel}]:[];
  },
  removeParticipant:async(room,id,options)=>{
   operations.removed.push({room,id,options});
   if(failRemoval)throw Error("temporary LiveKit failure");
  }
 };
 const harness=makeRoute("v3/moderation-route.ts",{
  respond:async sql=>{
   if(sql.startsWith("WITH removed AS")||sql.startsWith("WITH banned AS")){operations.mutation++;return [];}
   if(sql.startsWith("SELECT id FROM v3_channels"))return [{id:voiceChannel}];
   throw Error("Unexpected moderation SQL: "+sql);
  },modules:{"@/lib/livekit/server":{getRoomService:()=>service}}
 });
 return {...harness,operations,peer,voiceChannel};
}
test("kick disconnects the LiveKit participant with a token revocation cutoff",async()=>{
 const h=moderationHarness();
 const r=await result(await h.handlers.POST(request("/api/v3/moderation","POST",{serverId:channelId,userId:h.peer,action:"kick"})));
 assert.equal(r.status,200);assert.equal(r.body.ok,true);assert.equal(r.body.disconnected,true);
 assert.equal(r.body.failedRooms,0);assert.equal(h.operations.mutation,1);
 assert.equal(h.operations.removed.length,1);
 assert.equal(h.operations.removed[0].room,"v3-"+h.voiceChannel);
 assert.equal(h.operations.removed[0].id,h.peer);
 assert.equal(typeof h.operations.removed[0].options.revokeTokenTs,"bigint");
});
test("failed LiveKit removal returns warning and does not claim disconnection",async()=>{
 const h=moderationHarness({failRemoval:true});
 const r=await result(await h.handlers.POST(request("/api/v3/moderation","POST",{serverId:channelId,userId:h.peer,action:"kick"})));
 assert.equal(r.status,200);assert.equal(r.body.ok,true);assert.equal(r.body.disconnected,false);
 assert.equal(r.body.failedRooms,1);assert.equal(typeof r.body.warning,"string");
 assert.match(r.body.warning,/desconexão/);assert.equal(h.operations.mutation,1);
});
test("failed LiveKit room discovery reports uncertainty after a committed removal",async()=>{
 const h=moderationHarness({failListing:true});
 const r=await result(await h.handlers.POST(request("/api/v3/moderation","POST",{serverId:channelId,userId:h.peer,action:"kick"})));
 assert.equal(r.status,200);assert.equal(r.body.disconnected,false);
 assert.equal(typeof r.body.warning,"string");assert.equal(h.operations.mutation,1);
});
test("kick with no active LiveKit rooms does not make unnecessary disconnect calls",async()=>{
 const h=moderationHarness({active:false});
 const r=await result(await h.handlers.POST(request("/api/v3/moderation","POST",{serverId:channelId,userId:h.peer,action:"kick"})));
 assert.equal(r.status,200);assert.equal(r.body.disconnected,true);
 assert.equal(h.operations.removed.length,0);
});

function archiveHarness({kind="voice",active=true,failList=false,failDelete=false,updateRows=[{id:channelId}]}={}){
 const events={deleted:[],lookups:[]};
 const service={
  listRooms:async names=>{events.lookups.push(names);if(failList)throw Error("listing failed");return active?[{name:"v3-"+channelId}]:[];},
  deleteRoom:async name=>{events.deleted.push(name);if(failDelete)throw Error("delete failed");}
 };
 const h=makeRoute("v3/channels-route.ts",{
  respond:async sql=>{
   if(sql.startsWith("SELECT server_id,kind,name FROM v3_channels"))return [{server_id:channelId,kind,name:"voice-room"}];
   if(sql.startsWith("SELECT count(*)::int AS n FROM v3_channels"))return [{n:2}];
   if(sql.startsWith("UPDATE v3_channels SET archived_at"))return updateRows;
   throw Error("Unexpected archive SQL: "+sql);
  },modules:{"@/lib/livekit/server":{getRoomService:()=>service}}
 });
 return {...h,events};
}
test("archiving a voice channel disconnects its active LiveKit room",async()=>{
 const h=archiveHarness();
 const r=await result(await h.handlers.DELETE(request("/api/v3/channels","DELETE",{channelId})));
 assert.equal(r.status,200);assert.equal(r.body.archived,true);assert.equal(r.body.disconnected,true);
 assert.deepEqual(Array.from(h.events.deleted),["v3-"+channelId]);
 assert.match(h.calls[2].sql,/archived_at=now\(\)/);
});
test("archiving a voice channel without active LiveKit room is idempotent for media",async()=>{
 const h=archiveHarness({active:false});
 const r=await result(await h.handlers.DELETE(request("/api/v3/channels","DELETE",{channelId})));
 assert.equal(r.status,200);assert.equal(r.body.disconnected,true);assert.equal(h.events.deleted.length,0);
});
test("archive reports an explicit warning if LiveKit deletion fails after database commit",async()=>{
 const h=archiveHarness({failDelete:true});
 const r=await result(await h.handlers.DELETE(request("/api/v3/channels","DELETE",{channelId})));
 assert.equal(r.status,200);assert.equal(r.body.archived,true);assert.equal(r.body.disconnected,false);
 assert.match(r.body.warning,/não foi possível confirmar/);
 assert.equal(h.calls.filter(x=>x.sql.includes("UPDATE v3_channels SET archived_at")).length,1);
});
test("archive reports a warning when LiveKit discovery fails without rolling back database",async()=>{
 const h=archiveHarness({failList:true});
 const r=await result(await h.handlers.DELETE(request("/api/v3/channels","DELETE",{channelId})));
 assert.equal(r.status,200);assert.equal(r.body.disconnected,false);
 assert.equal(h.events.deleted.length,0);assert.equal(h.calls.length,3);
});
test("concurrent private-channel change is rejected by the atomic SQL update",async()=>{
 const h=makeRoute("v3/channels-route.ts",{
  respond:async sql=>{
   if(sql.startsWith("SELECT server_id,kind,name,category_id,is_private"))return [{server_id:channelId,kind:"text",name:"public-room",category_id:null,is_private:false}];
   if(sql.startsWith("UPDATE v3_channels SET name="))return [];
   throw Error("Unexpected edit SQL: "+sql);
  },modules:{"@/lib/livekit/server":{getRoomService:()=>({})}}
 });
 const r=await result(await h.handlers.PATCH(request("/api/v3/channels","PATCH",{channelId,name:"public-room",isPrivate:false})));
 assert.equal(r.status,409);
 assert.match(h.calls[1].sql,/NOT is_private OR coalesce\(\$2::boolean,true\)/);
 assert.match(h.calls[1].sql,/archived_at IS NULL/);
});

function grantHarness({active=true,blockedIdentity="00000000-0000-4000-8000-000000000004",allowedIdentity="00000000-0000-4000-8000-000000000005",failRemoval=false,failListing=false}={}){
 const events={rooms:[],listed:[],removed:[],writes:0};
 const participants=[{identity:blockedIdentity},{identity:allowedIdentity}];
 const client={
  listRooms:async names=>{events.rooms.push(names);if(failListing)throw Error("LiveKit unavailable");return active?[{name:"v3-"+channelId}]:[];},
  listParticipants:async name=>{events.listed.push(name);return participants;},
  removeParticipant:async (name,identity,opts)=>{events.removed.push({name,identity,opts});if(failRemoval)throw Error("revocation failure");}
 };
 const h=makeRoute("v3/channels-route.ts",{
  respond:async (sql,args)=>{
   if(sql.startsWith("SELECT server_id,kind,name,category_id,is_private FROM v3_channels"))return [{server_id:channelId,kind:"voice",name:"private-call",category_id:null,is_private:true}];
   if(sql.startsWith("SELECT 1 FROM v3_roles"))return [{ok:true}];
   if(sql.startsWith("DELETE FROM v3_channel_grants")){events.writes++;return [];}
   if(sql.startsWith("INSERT INTO v3_channel_grants")){events.writes++;return [];}
   if(sql.startsWith("SELECT v3_can_read_channel"))return [{allowed:args[1]===allowedIdentity}];
   throw Error("Unexpected grant SQL: "+sql);
  },modules:{"@/lib/livekit/server":{getRoomService:()=>client}}
 });
 return {...h,events,blockedIdentity,allowedIdentity};
}
test("revoking voice role grant disconnects only participants who have lost channel permission",async()=>{
 const h=grantHarness();
 const r=await result(await h.handlers.PATCH(request("/api/v3/channels","PATCH",{action:"grant",channelId,roleId:threadId,enabled:false})));
 assert.equal(r.status,200);assert.equal(r.body.ok,true);assert.equal(r.body.disconnected,true);
 assert.equal(r.body.removedParticipants,1);assert.equal(r.body.failedRemovals,0);
 assert.equal(h.events.writes,1);assert.equal(h.events.removed.length,1);
 assert.equal(h.events.removed[0].identity,h.blockedIdentity);
 assert.equal(typeof h.events.removed[0].opts.revokeTokenTs,"bigint");
});
test("revoking voice grant with no active call avoids invoking participant list",async()=>{
 const h=grantHarness({active:false});
 const r=await result(await h.handlers.PATCH(request("/api/v3/channels","PATCH",{action:"grant",channelId,roleId:threadId,enabled:false})));
 assert.equal(r.status,200);assert.equal(r.body.disconnected,true);
 assert.equal(h.events.listed.length,0);assert.equal(h.events.removed.length,0);
});
test("revoking voice grant returns warning if a participant removal fails",async()=>{
 const h=grantHarness({failRemoval:true});
 const r=await result(await h.handlers.PATCH(request("/api/v3/channels","PATCH",{action:"grant",channelId,roleId:threadId,enabled:false})));
 assert.equal(r.status,200);assert.equal(r.body.disconnected,false);
 assert.equal(r.body.failedRemovals,1);assert.match(r.body.warning,/não puderam ser desconectados/);
 assert.equal(h.events.writes,1);
});
test("grant revocation records incomplete media cleanup if LiveKit discovery fails",async()=>{
 const h=grantHarness({failListing:true});
 const r=await result(await h.handlers.PATCH(request("/api/v3/channels","PATCH",{action:"grant",channelId,roleId:threadId,enabled:false})));
 assert.equal(r.status,200);assert.equal(r.body.disconnected,false);
 assert.match(r.body.warning,/não pôde ser confirmada/);
 assert.equal(h.events.writes,1);
});
test("adding a channel grant never disconnects existing participants",async()=>{
 const h=grantHarness();
 const r=await result(await h.handlers.PATCH(request("/api/v3/channels","PATCH",{action:"grant",channelId,roleId:threadId,enabled:true})));
 assert.equal(r.status,200);assert.equal(r.body.ok,true);
 assert.equal(h.events.rooms.length,0);assert.equal(h.events.removed.length,0);
});

function roleCleanupHarness({command="unassign",active=true,blockedIdentity="00000000-0000-4000-8000-000000000004",allowedIdentity="00000000-0000-4000-8000-000000000005",failRemoval=false,failListing=false}={}){
 const events={removed:[],listed:[],roleWrites:0};
 const service={
  listRooms:async names=>{events.listed.push(names);if(failListing)throw Error("LiveKit offline");return active?[{name:"v3-"+channelId}]:[];},
  listParticipants:async()=>[{identity:blockedIdentity},{identity:allowedIdentity}],
  removeParticipant:async(name,identity,opts)=>{events.removed.push({name,identity,opts});if(failRemoval)throw Error("removal failed");}
 };
 const role={id:threadId,priority:1,manage_channels:false,manage_messages:false,moderate_members:false,manage_roles:false};
 const h=makeRoute("v3/roles-route.ts",{
  respond:async(sql,args)=>{
   if(sql.startsWith("SELECT id,priority,manage_channels,manage_messages,moderate_members,manage_roles FROM v3_roles"))return [role];
   if(sql.startsWith("DELETE FROM v3_member_roles")||sql.startsWith("DELETE FROM v3_roles WHERE")){events.roleWrites++;return [];}
   if(sql.startsWith("SELECT id FROM v3_channels WHERE server_id="))return [{id:channelId}];
   if(sql.startsWith("SELECT v3_can_read_channel"))return [{allowed:args[1]===allowedIdentity}];
   throw Error("Unexpected role SQL: "+sql);
  },modules:{"@/lib/livekit/server":{getRoomService:()=>service}}
 });
 return {...h,events,blockedIdentity,allowedIdentity,command};
}
test("unassigning a role disconnects only users who lose access to a private voice room",async()=>{
 const h=roleCleanupHarness();
 const r=await result(await h.handlers.PATCH(request("/api/v3/roles","PATCH",{action:"unassign",serverId:channelId,userId:h.blockedIdentity,roleId:threadId})));
 assert.equal(r.status,200);assert.equal(r.body.disconnected,true);
 assert.equal(r.body.removedParticipants,1);assert.equal(h.events.removed.length,1);
 assert.equal(h.events.removed[0].identity,h.blockedIdentity);
 assert.equal(h.events.roleWrites,1);
});
test("deleting a role reconciles current private voice call permissions",async()=>{
 const h=roleCleanupHarness();
 const r=await result(await h.handlers.DELETE(request("/api/v3/roles","DELETE",{serverId:channelId,roleId:threadId})));
 assert.equal(r.status,200);assert.equal(r.body.disconnected,true);
 assert.equal(h.events.removed.length,1);assert.equal(h.events.roleWrites,1);
});
test("role changes warn after DB commit when LiveKit removal fails",async()=>{
 const h=roleCleanupHarness({failRemoval:true});
 const r=await result(await h.handlers.DELETE(request("/api/v3/roles","DELETE",{serverId:channelId,roleId:threadId})));
 assert.equal(r.status,200);assert.equal(r.body.disconnected,false);
 assert.equal(r.body.failedRemovals,1);assert.match(r.body.warning,/não puderam ser atualizadas/);
 assert.equal(h.events.roleWrites,1);
});
test("role changes warn when the LiveKit room service cannot be reached",async()=>{
 const h=roleCleanupHarness({failListing:true});
 const r=await result(await h.handlers.DELETE(request("/api/v3/roles","DELETE",{serverId:channelId,roleId:threadId})));
 assert.equal(r.status,200);assert.equal(r.body.disconnected,false);
 assert.match(r.body.warning,/não foi possível confirmar/);
 assert.equal(h.events.roleWrites,1);
});
test("role cleanup does not remove participants when no private voice call is active",async()=>{
 const h=roleCleanupHarness({active:false});
 const r=await result(await h.handlers.PATCH(request("/api/v3/roles","PATCH",{action:"unassign",serverId:channelId,userId:h.blockedIdentity,roleId:threadId})));
 assert.equal(r.status,200);assert.equal(r.body.disconnected,true);
 assert.equal(h.events.removed.length,0);
});

test("opening a DM thread rechecks common server and both block directions during INSERT",async()=>{
 const peer="00000000-0000-4000-8000-000000000004";
 const h=makeRoute("v3/dm-route.ts",{respond:async sql=>{
  if(sql.startsWith("SELECT 1 FROM v3_blocks"))return [];
  if(sql.startsWith("SELECT 1 FROM v2_memberships"))return [{yes:1}];
  if(sql.startsWith("INSERT INTO v3_dm_threads"))return [];
  throw Error("Unexpected SQL: "+sql);
 }});
 const r=await result(await h.handlers.POST(request("/api/v3/dm","POST",{action:"open",peerId:peer})));
 assert.equal(r.status,403);
 const insert=h.calls.find(x=>x.sql.startsWith("INSERT INTO v3_dm_threads"));
 assert.ok(insert);assert.match(insert.sql,/EXISTS\(/);
 assert.match(insert.sql,/v2_memberships/);assert.match(insert.sql,/v3_blocks/);
 assert.match(insert.sql,/ON CONFLICT\(user_a,user_b\)/);
});
test("DM thread open returns id after conditional INSERT authorizes both participants",async()=>{
 const peer="00000000-0000-4000-8000-000000000004";
 const h=makeRoute("v3/dm-route.ts",{respond:async sql=>{
  if(sql.startsWith("SELECT 1 FROM v3_blocks"))return [];
  if(sql.startsWith("SELECT 1 FROM v2_memberships"))return [{yes:1}];
  if(sql.startsWith("INSERT INTO v3_dm_threads"))return [{id:threadId}];
  throw Error("Unexpected SQL: "+sql);
 }});
 const r=await result(await h.handlers.POST(request("/api/v3/dm","POST",{action:"open",peerId:peer})));
 assert.equal(r.status,200);assert.equal(r.body.threadId,threadId);
});
test("origin checker matches full origin, including scheme and port",()=>{
 const crypto=require("node:crypto"),util=require("node:util");
 const source=fs.readFileSync(path.join(root,"v2/auth.ts"),"utf8");
 const compiled=ts.transpileModule(source,{fileName:"v2/auth.ts",compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2019}}).outputText;
 const module={exports:{}};
 vm.runInNewContext(compiled,{module,exports:module.exports,require:name=>{
  if(name==="next/headers")return {cookies:async()=>({get:()=>undefined})};
  if(name==="node:crypto")return crypto;
  if(name==="node:util")return util;
  if(name==="./database")return {db:async()=>[]};
  throw Error("Unexpected auth import: "+name);
 },process:{env:{NODE_ENV:"test"}},Buffer,URL,Response,console},{filename:"v2/auth.ts",timeout:2000});
 const verify=module.exports.verifyOrigin;
 const sample=(url,origin)=>({url,headers:new Headers(origin===null?{}:{origin})});
 assert.equal(verify(sample("https://test.local/api/v2/auth","https://test.local")),true);
 assert.equal(verify(sample("http://localhost:3000/api/v2/auth","http://localhost:3000")),true);
 assert.equal(verify(sample("https://test.local/api/v2/auth","http://test.local")),false);
 assert.equal(verify(sample("https://test.local/api/v2/auth","https://test.local:8443")),false);
 assert.equal(verify(sample("https://test.local/api/v2/auth","https://attacker.test.local")),false);
 assert.equal(verify(sample("https://test.local/api/v2/auth",null)),false);
});
