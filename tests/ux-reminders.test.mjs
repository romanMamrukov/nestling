import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const clone=x=>JSON.parse(JSON.stringify(x));
function fixture(){
 const elements=new Map(),deviceNotifications=[],timerCallbacks=[],dialogs=[],alerts=[];
 const input=()=>({name:{value:"Test"},dob:{value:"2026-05-09"},bedtime:{value:"19:30"},reminder:{value:"15"},language:{value:"ru"},backupReminder:{value:"daily"},start:{value:""},end:{value:""},id:{value:""}});
 function element(key){if(!elements.has(key))elements.set(key,{value:"",hidden:false,innerHTML:"",textContent:"",style:{},classList:{add(){},remove(){},toggle(){}},elements:input(),addEventListener(){},showModal(){dialogs.push(key)},close(){},remove(){},setAttribute(){}});return elements.get(key)}
 const document={documentElement:{lang:"en"},visibilityState:"visible",querySelector:element,querySelectorAll:()=>[],addEventListener(){},createElement:()=>({style:{},click(){},remove(){}}),body:{append(){}}};
 const window={addEventListener(){}};
 const context={window,document};
 runInNewContext(read("i18n.js"),context);
 const old={baby:{name:"Test",dob:"2026-05-09"},prefs:{bedtime:"19:30",reminder:15,language:"ru",backupReminder:"daily"},sessions:[],active:null};
 let stored=clone(old),writes=0;
 const db={init:async()=>({state:clone(stored),migrated:false}),replace:async data=>{stored=clone(data);writes++;return writes},legacyKey:"nestling-local-v2",requestPersistence:async()=>true};
 function Notification(){} Notification.permission="granted";Notification.requestPermission=async()=>"granted";window.Notification=Notification;
 const serviceWorker={ready:Promise.resolve({showNotification:async(...args)=>deviceNotifications.push(args)}),register:async()=>({waiting:null,addEventListener(){}}),addEventListener(){}};
 const storage={getItem(){return null},setItem(){},removeItem(){}};
 Object.assign(context,{NestlingLocale:window.NestlingLocale,
 NestlingSchedule:{ageMonths:()=>7,compute:()=>({ready:true,type:"Nap",target:Date.now()+8*60000,earliest:Date.now()+5*60000,latest:Date.now()+10*60000,history:1,samples:0,minutes:160,rows:[],profile:null,calibrated:false})},
 NestlingDB:db,NestlingBackup:{envelope:x=>x,download(){}},navigator:{serviceWorker},localStorage:storage,sessionStorage:storage,crypto:{randomUUID:()=>"uuid"},structuredClone:clone,
 setInterval:callback=>timerCallbacks.push(callback),setTimeout:()=>1,clearTimeout(){},confirm:()=>true,prompt:()=>"",Notification,Date,Math,JSON,Number,Promise,Error,Blob,URL,console});
 runInNewContext(read("app.js"),context);
 return{element,document,dialogs,alerts,deviceNotifications,timerCallbacks,getStored:()=>stored,getWrites:()=>writes};
}
function localDatetime(timestamp){
 const d=new Date(timestamp),pad=n=>String(n).padStart(2,"0");
 return [d.getFullYear(),pad(d.getMonth()+1),pad(d.getDate())].join("-")+"T"+pad(d.getHours())+":"+pad(d.getMinutes());
}
test("manual sleep start persists an earlier start without requiring a finished sleep",async()=>{
 const f=fixture();await settle();f.element("#adjustStart").onclick();
 assert.ok(f.dialogs.includes("#startDialog"));
 const start=Date.now()-25*60000;
 f.element("#startForm").elements.start.value=localDatetime(start);
 f.element("#startForm").onsubmit({preventDefault(){},target:f.element("#startForm")});
 await settle();await settle();
 assert.ok(Math.abs(f.getStored().active.start-start)<61000);
 assert.equal(f.getStored().sessions.length,0);
 f.element("#discardTimer").onclick();await settle();await settle();
 assert.equal(f.getStored().active,null);
});
test("device notification test uses service worker showNotification, not new Notification",async()=>{
 const f=fixture();await settle();await f.element("#testNotification").onclick();await settle();
 assert.equal(f.deviceNotifications.length,1);
 assert.equal(f.deviceNotifications[0][0],"Nestling");
});
test("due sleep reminders show a visible banner and a service worker alert",async()=>{
 const f=fixture();await settle();f.timerCallbacks[0]();await settle();await settle();
 assert.equal(f.element("#reminderBanner").hidden,false);
 assert.equal(f.deviceNotifications.length,1);
 f.element("#dismissReminder").onclick();
 assert.equal(f.element("#reminderBanner").hidden,true);
});
test("translation keys for controls and dynamic messages exist across all languages",()=>{
 const w={},doc={documentElement:{lang:"en"},querySelectorAll:()=>[]};
 runInNewContext(read("i18n.js"),{window:w,document:doc});
 const html=read("index.html"),app=read("app.js");
 const keys=new Set([
 ...[...html.matchAll(/data-i18n(?:-placeholder|-aria-label)?="([^"]+)"/g)].map(m=>m[1]),
 ...[...app.matchAll(/\bt\("([^"]+)"\)/g)].map(m=>m[1])
 ]);
 for(const lang of ["en","lv","ru"])for(const key of keys)
 assert.notEqual(w.NestlingLocale.t(key,lang),key,lang+": "+key);
});
test("backup reminder setting is validated and included in browser preferences",()=>{
 const sandbox={window:{},structuredClone:clone};
 runInNewContext(read("storage.js"),sandbox);
 const normal=sandbox.window.NestlingDB.check({baby:null,active:null,sessions:[],prefs:{backupReminder:"daily"}});
 assert.equal(normal.prefs.backupReminder,"daily");
 assert.throws(()=>sandbox.window.NestlingDB.check({baby:null,active:null,sessions:[],prefs:{backupReminder:"weekly"}}),/backup reminder/i);
});
