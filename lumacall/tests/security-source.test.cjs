// Fast, dependency-free regression guard for the V2/V3 boundary.
// Run from the lumacall/ package directory: node --test tests/security-source.test.cjs
const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {join}=require("node:path");
const source=(path)=>readFileSync(join(__dirname,"..",path),"utf8");

test("invite normalization is shared between ban lookup, join, and member lookup",()=>{
 const s=source("v2/join-route.ts");
 assert.match(s,/const normalizedCode=code\.trim\(\)\.toUpperCase\(\)/);
 assert.match(s,/code:\s*unknown|code\?:unknown|code\?:unknown|code\?:/); // refuse arbitrary input
 assert.match(s,/result==="BANNED"/);
 assert.equal((s.match(/\[normalizedCode,user\.id\]/g)||[]).length,3);
 assert.doesNotMatch(s,/\[code(?:\.toUpperCase\(\))?,user\.id\]/);
});
test("transactional join checks the ban before membership and capacity",()=>{
 const s=source("v3/security-hardening.sql");
 const block=s.slice(s.indexOf("CREATE OR REPLACE FUNCTION v2_join_server"));
 assert.ok(block.indexOf("FOR UPDATE")>=0);
 assert.ok(block.indexOf("FROM v3_bans")>=0);
 assert.ok(block.indexOf("FROM v3_bans")<block.indexOf("ALREADY_MEMBER"));
 assert.ok(block.indexOf("FROM v3_bans")<block.indexOf("IF cnt>=6"));
});
test("deleted channels are archived; messages are never moved into a public channel",()=>{
 const s=source("v3/channels-route.ts");
 assert.match(s,/archived_at=now\(\)/);
 assert.match(s,/archived_name=name/);
 assert.doesNotMatch(s,/DELETE FROM v3_channels/);
 assert.doesNotMatch(s,/UPDATE v2_messages SET channel_id/);
 const m=source("v2/messages-route.ts");
 assert.doesNotMatch(m,/x\.channel_id IS NULL/);
 assert.match(m,/v3_can_read_channel/);
});
test("archived channels cannot be opened by text or voice endpoints",()=>{
 const sql=source("v3/security-hardening.sql");
 assert.match(sql,/c\.archived_at IS NULL/);
 const c=source("v3/channels-route.ts");
 assert.match(c,/archived_at IS NULL/);
 const oldVoice=source("v2/voice-route.ts");
 assert.doesNotMatch(oldVoice,/new AccessToken|addGrant/);
 assert.match(oldVoice,/,410\)/);
});
test("no production-dangerous database cleanup in hardening migration",()=>{
 const sql=source("v3/security-hardening.sql");
 assert.doesNotMatch(sql,/\b(?:DROP|TRUNCATE|DELETE FROM|UPDATE v2_messages)\b/i);
});
