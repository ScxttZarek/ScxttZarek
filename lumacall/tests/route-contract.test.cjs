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
  member:async()=>({role:"member"})
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

function fakeVoice({permissions=[{server_id:channelId},{server_id:channelId}],createFails=false,roomExists=true}={}){
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
