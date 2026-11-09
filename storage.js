/* Nestling v3 — offline-first persistence. No network requests. */
(()=>{
"use strict";
const DB_NAME="nestling-v3", DB_VERSION=1, LEGACY_KEY="nestling-local-v2";
let db,revision=0;
function request(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error("Database operation failed"));});}
function txDone(tx){return new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error||new Error("Database transaction aborted"));tx.onerror=()=>{};});}
function open(){return new Promise((resolve,reject)=>{
const req=indexedDB.open(DB_NAME,DB_VERSION);
req.onupgradeneeded=()=>{const d=req.result;for(const n of ["profile","preferences","sessions","meta"])if(!d.objectStoreNames.contains(n))d.createObjectStore(n,{keyPath:"id"});};
req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error("Unable to open IndexedDB"));req.onblocked=()=>reject(new Error("Close other Nestling tabs to upgrade the database"));
});}
const clone=x=>structuredClone(x);
function check(s){if(!s||typeof s!=="object"||!Array.isArray(s.sessions)||s.sessions.length>50000)throw Error("Invalid sleep dataset");
if(s.baby!==null&&s.baby!==undefined){if(typeof s.baby.name!=="string"||!s.baby.name.trim()||s.baby.name.length>40||typeof s.baby.dob!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(s.baby.dob)||!Number.isFinite(Date.parse(s.baby.dob+"T12:00:00")))throw Error("Invalid baby profile");}
let ids=new Set(),valid=[];for(const x of s.sessions){if(!x||typeof x.id!=="string"||!x.id||ids.has(x.id)||!Number.isFinite(x.start)||!Number.isFinite(x.end)||x.start>=x.end||x.end-x.start>18*3600000||x.end>Date.now()+60000)throw Error("Invalid or duplicate sleep session");ids.add(x.id);valid.push(x);}
valid.sort((a,b)=>a.start-b.start);for(let i=1;i<valid.length;i++)if(valid[i].start<valid[i-1].end)throw Error("Overlapping sleep sessions");
if(s.active!==null&&s.active!==undefined&&(!Number.isFinite(s.active.start)||s.active.start>Date.now()+60000||s.active.start<0))throw Error("Invalid active timer");
const prefs=s.prefs||{};if(prefs.bedtime!==undefined&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(prefs.bedtime))throw Error("Invalid bedtime");
if(prefs.language!==undefined&&!["en","lv","ru"].includes(prefs.language))throw Error("Invalid language");
if(prefs.reminder!==undefined&&![0,5,10,15,30].includes(Number(prefs.reminder)))throw Error("Invalid reminder");
return clone({baby:s.baby||null,prefs:{bedtime:prefs.bedtime||"19:30",reminder:Number(prefs.reminder??15),language:prefs.language||"en"},sessions:valid,active:s.active||null});}
async function getData(){const tx=db.transaction(["profile","preferences","sessions","meta"],"readonly"),done=txDone(tx);
const [baby,prefs,active,rows,rev]=await Promise.all([request(tx.objectStore("profile").get("baby")),request(tx.objectStore("preferences").get("prefs")),request(tx.objectStore("meta").get("active")),request(tx.objectStore("sessions").getAll()),request(tx.objectStore("meta").get("revision"))]);await done;
return{revision:rev?.value||0,state:{baby:baby?.value||null,prefs:prefs?.value||{bedtime:"19:30",reminder:15,language:"en"},active:active?.value||null,sessions:rows.map(r=>r.value)}};}
async function commit(state,expectedRevision){const dataset=check(state),tx=db.transaction(["profile","preferences","sessions","meta"],"readwrite"),done=txDone(tx);try{
const meta=tx.objectStore("meta"),v=await request(meta.get("revision"));const current=v?.value||0;
if(current!==expectedRevision){tx.abort();await done.catch(()=>{});const err=Error("Another tab changed Nestling data. Reload before saving.");err.name="ConflictError";throw err;}
tx.objectStore("profile").put({id:"baby",value:dataset.baby});tx.objectStore("preferences").put({id:"prefs",value:dataset.prefs});
const sessions=tx.objectStore("sessions");sessions.clear();for(const row of dataset.sessions)sessions.put({id:row.id,value:row});
meta.put({id:"active",value:dataset.active});meta.put({id:"revision",value:current+1});await done;revision=current+1;return revision;
}catch(e){if(tx.readyState==="active")tx.abort();await done.catch(()=>{});throw e;}}
async function init(){db=await open();const stored=await getData();revision=stored.revision;
if(revision>0)return{state:check(stored.state),migrated:false,revision};
let raw;try{raw=localStorage.getItem(LEGACY_KEY)}catch{}
if(raw){let data;try{data=check(JSON.parse(raw))}catch(e){throw Error("Existing sleep records need recovery: "+e.message+". Nothing has been deleted.");}
await commit(data,0);const roundtrip=await getData();
if(JSON.stringify(check(roundtrip.state))!==JSON.stringify(data))throw Error("Migration verification failed; original browser data was preserved.");
return{state:data,migrated:true,revision};}
return{state:check(stored.state),migrated:false,revision};}
async function replace(state){const next=await commit(state,revision);return next;}
async function refresh(){const r=await getData();revision=r.revision;return check(r.state);}
async function storageStatus(){if(!navigator.storage?.estimate)return null;const estimate=await navigator.storage.estimate();let persisted=await navigator.storage.persisted?.();return{usage:estimate.usage||0,quota:estimate.quota||0,persisted:!!persisted};}
async function requestPersistence(){return typeof navigator.storage?.persist==="function"?navigator.storage.persist():false;}
window.NestlingDB={init,replace,refresh,check,storageStatus,requestPersistence,legacyKey:LEGACY_KEY};
})();