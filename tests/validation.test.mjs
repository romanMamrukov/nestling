import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { webcrypto } from "node:crypto";
import { TextEncoder, TextDecoder } from "node:util";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const context = {
  window: {},
  structuredClone,
  crypto: webcrypto,
  TextEncoder,
  TextDecoder,
  Uint8Array,
  btoa: input => Buffer.from(input, "binary").toString("base64"),
  atob: input => Buffer.from(input, "base64").toString("binary"),
  Date,
  JSON,
  Number,
  String,
  Array,
  Object,
  Promise,
  Error,
};
runInNewContext(read("storage.js"), context);
runInNewContext(read("backup.js"), context);
const { check } = context.window.NestlingDB;
const { envelope, read: decode, encrypt, decrypt } = context.window.NestlingBackup;
const now = Date.now();
const valid = () => ({
  baby: { name: "Alex", dob: "2026-06-01" },
  prefs: { language: "lv", bedtime: "19:30", reminder: 15 },
  active: null,
  sessions: [
    { id: "a", start: now - 8000000, end: now - 7000000 },
    { id: "b", start: now - 5000000, end: now - 4000000 }
  ]
});

test("valid sleep records and language persist through normalized backup", () => {
  const data = decode(envelope(valid()));
  assert.equal(data.sessions.length, 2);
  assert.equal(data.prefs.language, "lv");
  assert.equal(data.baby.name, "Alex");
});
test("rejects overlapping sleep records", () => {
  const data=valid(); data.sessions[1].start=data.sessions[0].end-1000;
  assert.throws(()=>check(data), /overlap/i);
});
test("rejects duplicate IDs", () => {
  const data=valid();data.sessions[1].id="a";
  assert.throws(()=>check(data), /duplicate/i);
});
test("rejects future sessions", () => {
  const data=valid();data.sessions[0].end=now+100000;
  assert.throws(()=>check(data));
});
test("rejects invalid preference values", () => {
  const data=valid();data.prefs.language="xx";
  assert.throws(()=>check(data),/language/i);
});
test("rejects invalid timer start", () => {
  const data=valid();data.active={start:now+100000};
  assert.throws(()=>check(data),/timer/i);
});
test("legacy v2 JSON with sessions is importable", () => {
  const data=decode(valid()); assert.equal(data.prefs.bedtime,"19:30");
});
test("rejects unknown backup schema",()=>{
  assert.throws(()=>decode({format:"unknown",version:99,data:valid()}));
});
test("encrypted backup round-trip and incorrect-password rejection",async()=>{
  const file=await encrypt(valid(),"long-test-passphrase-123");
  const data=await decrypt(file,"long-test-passphrase-123");
  assert.equal(data.sessions.length,2);
  assert.equal(data.prefs.language,"lv");
  await assert.rejects(decrypt(file,"incorrect-passphrase"),/decrypt/i);
});
test("password length requirement",async()=>{
  await assert.rejects(encrypt(valid(),"short"),/12 characters/i);
});
test("all visible static UI translation keys exist in all supported languages",()=>{
  const html=read("index.html"),keys=[...html.matchAll(/data-i18n="([^"]+)"/g)].map(m=>m[1]);
  const w={},doc={documentElement:{lang:"en"},querySelectorAll:()=>[]};
  runInNewContext(read("i18n.js"),{window:w,document:doc});
  for(const lang of ["en","lv","ru"])for(const key of keys)
    assert.notEqual(w.NestlingLocale.t(key,lang),key,lang+": "+key);
});
test("offline worker includes all required application assets",()=>{
  const sw=read("sw.js");
  for(const path of ["./index.html","./app.js","./storage.js","./backup.js","./i18n.js","./manifest.webmanifest"])
    assert.ok(sw.includes(path),path);
});
