
(()=>{
"use strict";
const MIN=60000,DAY=86400000;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const t=k=>NestlingLocale.t(k,state?.prefs?.language||"en");const now=()=>Date.now(),fmt=t=>new Date(t).toLocaleTimeString(state?.prefs?.language||"en",{hour:"2-digit",minute:"2-digit"}),fdate=t=>new Date(t).toLocaleDateString(state?.prefs?.language||"en",{weekday:"short",month:"short",day:"numeric"}),dur=m=>Math.floor(m/60)+"h "+Math.round(m%60)+"m";
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let state={baby:null,prefs:{bedtime:"19:30",reminder:15,language:"en"},sessions:[],active:null},lastAlert="";
let writes=Promise.resolve(),writeBlocked=false,channel;
function save(){if(writeBlocked){toast("Storage unavailable. Export your data before closing this page.");return Promise.resolve(false)}
const snapshot=structuredClone(state);
writes=writes.then(async()=>{await NestlingDB.replace(snapshot);channel?.postMessage({changed:true});return true}).catch(err=>{writeBlocked=true;const warning=document.querySelector("#storageError");warning.hidden=false;warning.textContent=t("storageFailure")+": "+err.message+". Export a backup before leaving this page.";toast(t("storageFailure")+": "+err.message);return false});
return writes;}
function applyLanguage(){state.prefs.language=NestlingLocale.valid(state.prefs.language);NestlingLocale.apply(state.prefs.language)}
$("#headerLanguage").addEventListener("change",e=>{if(writeBlocked)return;state.prefs.language=NestlingLocale.valid(e.target.value);save();render()});
function toast(s){const x=$("#toast");x.textContent=s;x.style.display="block";clearTimeout(toast.timer);toast.timer=setTimeout(()=>x.style.display="none",3000)}
const age=()=>NestlingSchedule.ageMonths(state.baby?.dob)??0;
const guidance=m=>m<4?[14,17,"Newborn sleep varies widely; no precise nap timing guidance is medically validated."]:m<12?[12,16,"AASM sleep duration guidance, 4–12 months"]:m<36?[11,14,"AASM sleep duration guidance, 1–2 years"]:[10,13,"AASM sleep duration guidance, 3–5 years"];
function cleanSessions(){return state.sessions.filter(s=>Number.isFinite(s.start)&&Number.isFinite(s.end)&&s.start<s.end&&s.end<=now()+MIN&&s.end-s.start<=18*3600000).sort((a,b)=>a.start-b.start)}
function sleepBetween(a,b){return cleanSessions().reduce((v,s)=>v+Math.max(0,Math.min(b,s.end)-Math.max(a,s.start))/MIN,0)}
function isNight(s){const time=new Date(s.start),min=time.getHours()*60+time.getMinutes(),[h,m]=state.prefs.bedtime.split(":").map(Number),bed=h*60+m,diff=Math.abs(((min-bed+2160)%1440)-720);return(s.end-s.start)/MIN>=240||diff<=120||min<300}
function forecast(){return NestlingSchedule.compute({dob:state.baby?.dob,sessions:state.sessions,active:state.active,bedtime:state.prefs.bedtime,now:now()})}
function render(){applyLanguage();if(!state.baby){$("#welcome").classList.remove("hide");$("#main").classList.add("hide");$("#setup [name=dob]").max=new Date().toISOString().slice(0,10);return}$("#welcome").classList.add("hide");$("#main").classList.remove("hide");$("#greeting").textContent=state.baby.name;$("#age").textContent=age()+" "+t("ageMonths");const p=forecast(),rows=p.rows||cleanSessions(),ts=now(),start=new Date();start.setHours(0,0,0,0);
$("#todayTotal").textContent=dur(sleepBetween(+start,ts)+(state.active?Math.max(0,(ts-Math.max(state.active.start,+start))/MIN):0));$("#todayCount").textContent=rows.filter(s=>s.end>+start).length;$("#lastWake").textContent=rows.length?fmt(rows.at(-1).end):"—";$("#rollingTotal").textContent=dur(sleepBetween(ts-DAY,ts));let g=guidance(age());$("#guidance").textContent=t("recorded")+": "+dur(sleepBetween(ts-DAY,ts))+". "+t("population")+": "+g[0]+"–"+g[1]+" "+t("hours")+"/24h. "+t(age()<4?"guideNewborn":age()<12?"guideAasmInfant":age()<36?"guideAasmToddler":"guideAasmChild")+". "+t("missing");
$("#forecast").textContent=state.active?t("sleeping")+" · "+dur((ts-state.active.start)/MIN):p.ready?fmt(p.target):t(p.reasonKey||"addPrompt");$("#range").textContent=p.ready?t(p.type==="Bedtime"?"bedtime":"nap")+" · "+fmt(p.earliest)+" – "+fmt(p.latest):t("needsRecord");$("#forecastNote").textContent=p.ready?p.history+" "+t("usedIntervals")+". "+t(p.calibrated?"pastNotValidated":"notCalibrated")+(p.referenceOnly?" "+t("newbornCaution"):""):t("noSubstitute");$("#toggleSleep").textContent=t(state.active?"stopSleep":"startSleep");$("#discardTimer").hidden=!state.active;
const entry=s=>'<div class="entry"><div><strong>'+fdate(s.start)+' · '+fmt(s.start)+'–'+fmt(s.end)+'</strong><small>'+dur((s.end-s.start)/MIN)+' · '+t(isNight(s)?"nightEstimated":"napEstimated")+'</small></div><div class="actions" style="margin:0"><button data-edit="'+escapeHTML(s.id)+'">'+t("edit")+'</button><button data-delete="'+escapeHTML(s.id)+'" style="color:#a03d35">'+t("delete")+'</button></div></div>';
$("#recent").innerHTML=rows.slice(-4).reverse().map(entry).join("")||'<p class="muted">'+t("noRecent")+'</p>';$("#historyEntries").innerHTML=rows.slice().reverse().map(entry).join("")||'<p class="muted">'+t("noRecords")+'</p>';
let bars=[];for(let i=6;i>=0;i--){let d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i);let end=new Date(d);end.setDate(end.getDate()+1);bars.push({label:d.toLocaleDateString(undefined,{weekday:"short"}),hours:sleepBetween(+d,Math.min(+end,ts))/60})}$("#bars").innerHTML=bars.map(v=>'<div class="barcol"><span>'+v.hours.toFixed(1)+'h</span><div class="bar" style="height:'+Math.min(100,v.hours/17*100)+'%"></div><span>'+v.label+'</span></div>').join("");
const prof=p.profile,minutesFmt=n=>n===null||n===undefined?"—":Math.floor(n/60)+"h "+n%60+"m";
const ageInfo=prof?'<div class="stat">'+t("referenceWake")+': '+minutesFmt(prof.wake[0])+'–'+minutesFmt(prof.wake[1])+
'<br>'+t("referenceNaps")+': '+prof.naps[0]+'–'+prof.naps[1]+
'<br>'+t("napDuration")+': '+minutesFmt(prof.napDuration[0])+'–'+minutesFmt(prof.napDuration[1])+
'<br>'+t("daytimeSleep")+': '+minutesFmt(prof.daySleep[0])+'–'+minutesFmt(prof.daySleep[1])+
'<br>'+t("nighttimeSleep")+': '+minutesFmt(prof.nightSleep[0])+'–'+minutesFmt(prof.nightSleep[1])+
'<br>'+t("referenceDailySleep")+': '+minutesFmt(prof.total[0])+'–'+minutesFmt(prof.total[1])+'</div>':"";
$("#predictionDetails").innerHTML='<div class="stat">'+t("ageLabel")+': '+age()+' '+t("ageMonths")+
'<br>'+t("estimatedInterval")+': '+(p.minutes??"—")+' '+t("minutes")+
'<br>'+t("historicalIntervals")+': '+(p.history??0)+
'<br>'+t("retrospective")+': '+(p.samples??0)+
'<br>'+t("errorProxy")+': '+(p.mae==null?t("notAvailable"):p.mae+' '+t("minutes"))+
'</div><h3>'+t("ageReferenceTitle")+'</h3>'+ageInfo+
'<div class="notice">'+t("referenceDisclaimer")+'</div>'+
'<div class="notice">'+t("heuristicNotice")+'</div>';
$("#profile [name=name]").value=state.baby.name;$("#profile [name=dob]").value=state.baby.dob;$("#profile [name=dob]").max=new Date().toISOString().slice(0,10);$("#profile [name=bedtime]").value=state.prefs.bedtime;$("#profile [name=reminder]").value=state.prefs.reminder;$("#profile [name=language]").value=state.prefs.language;
}
function validRange(start,end,ignore=null){if(!(start<end)||end>now()+MIN||end-start>18*3600000)return t("invalidRange");if(cleanSessions().some(s=>s.id!==ignore&&start<s.end&&end>s.start))return t("overlap");return""}
function localValue(t){let d=new Date(t),off=d.getTimezoneOffset()*MIN;return new Date(t-off).toISOString().slice(0,16)}
function openEntry(id){const s=state.sessions.find(x=>x.id===id);$("#dialogTitle").textContent=t(s?"editSleep":"addSleep");let f=$("#entryForm");f.elements.id.value=s?.id||"";f.elements.start.value=localValue(s?.start??now()-60*MIN);f.elements.end.value=localValue(s?.end??now());$("#entryDialog").showModal()}
$("#setup").onsubmit=e=>{e.preventDefault();if(writeBlocked)return;const f=e.target;if(+new Date(f.elements.dob.value+"T12:00")>now())return toast(t("birthFuture"));state.baby={name:f.elements.name.value.trim(),dob:f.elements.dob.value};state.prefs.bedtime=f.elements.bedtime.value;save();render()};
$("#profile").onsubmit=e=>{e.preventDefault();if(writeBlocked)return;let f=e.target;if(+new Date(f.elements.dob.value+"T12:00")>now())return toast(t("birthFuture"));state.baby={name:f.elements.name.value.trim(),dob:f.elements.dob.value};state.prefs={bedtime:f.elements.bedtime.value,reminder:Number(f.elements.reminder.value),language:NestlingLocale.valid(f.elements.language.value)};lastAlert="";save();render();toast(t("settingsSaved"))};
$("#discardTimer").onclick=()=>{if(writeBlocked||!state.active||!confirm(t("discardConfirm")))return;state.active=null;save();render();toast(t("timerDiscarded"))};
$("#toggleSleep").onclick=()=>{if(writeBlocked)return;if(!state.active){state.active={start:now()};save();render();return}let start=state.active.start,end=now();if(end-start<MIN)return toast(t("tooShort"));const error=validRange(start,end);if(error)return toast(error);state.sessions.push({id:crypto.randomUUID(),start,end});state.active=null;save();render();toast(t("sleepRecorded"))};
$("#entryForm").onsubmit=e=>{e.preventDefault();if(writeBlocked)return;const f=e.target,start=+new Date(f.elements.start.value),end=+new Date(f.elements.end.value),id=f.elements.id.value;let error=validRange(start,end,id);if(error)return toast(error);if(id){const row=state.sessions.find(s=>s.id===id);if(!row)return toast(t("entryMissing"));row.start=start;row.end=end}else state.sessions.push({id:crypto.randomUUID(),start,end});save();$("#entryDialog").close();render();toast(t("sleepSaved"))};
$("#cancelDialog").onclick=()=>$("#entryDialog").close();
$("#addEntry").onclick=()=>openEntry();$("#historyAdd").onclick=()=>openEntry();$("#allHistory").onclick=()=>setTab("history");
document.addEventListener("click",e=>{if(writeBlocked)return;const edit=e.target.closest("[data-edit]");if(edit)openEntry(edit.dataset.edit);const del=e.target.closest("[data-delete]");if(del){const id=del.dataset.delete;if(confirm(t("deleteConfirm"))){state.sessions=state.sessions.filter(s=>s.id!==id);save();render();toast(t("sleepDeleted"))}}});
function setTab(name){$$(".tabs button").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));["dashboard","history","insights","settings"].forEach(t=>$("#"+t).classList.toggle("hide",t!==name))}
$$(".tabs button").forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
$("#export").onclick=()=>{try{NestlingBackup.download(NestlingBackup.envelope(state),"nestling-backup-"+new Date().toISOString().slice(0,10)+".json");toast(t("backupDownloaded"))}catch(err){toast(err.message)}};
$("#exportEncrypted").onclick=async()=>{try{
const password=prompt(t("passwordPrompt"));if(password===null)return;
const verify=prompt(t("repeatPassword"));if(verify===null)return;
if(password!==verify)throw Error(t("passwordMismatch"));
const data=await NestlingBackup.encrypt(state,password);NestlingBackup.download(data,"nestling-encrypted-"+new Date().toISOString().slice(0,10)+".json");
toast(t("encryptedDownloaded"));}catch(err){toast(err.message)}};
$("#persist").onclick=async()=>{try{const ok=await NestlingDB.requestPersistence();toast(t(ok?"persistentGranted":"persistentDenied"))}catch(err){toast(err.message)}};
$("#import").onclick=()=>$("#importFile").click();
$("#importFile").onchange=async e=>{
const file=e.target.files[0];if(!file)return;
try{
if(writeBlocked)throw Error("Storage unavailable");
if(file.size>5000000)throw Error("Backup exceeds 5 MB");
const obj=JSON.parse(await file.text());
const data=obj.format==="nestling-encrypted-backup"?
await NestlingBackup.decrypt(obj,prompt("Password for encrypted backup")||""):NestlingBackup.read(obj);
const preview="Baby: "+(data.baby?.name||"none")+"\nSleep sessions: "+data.sessions.length+
"\nLanguage: "+data.prefs.language+"\nTimer: "+(data.active?"Running":"Off")+
"\n\nReplace all existing records with this backup?";
if(!confirm(preview))return;
const previous=structuredClone(state);state=data;
const ok=await save();if(!ok){state=previous;render();return}
render();toast(t("imported"));
}catch(err){toast(err.message)}finally{e.target.value=""}};
$("#reset").onclick=async()=>{
if(writeBlocked||!confirm(t("deleteAllConfirm")))return;
const previous=structuredClone(state);state={baby:null,prefs:{bedtime:"19:30",reminder:15,language:"en"},sessions:[],active:null};
const ok=await save();if(!ok){state=previous;return}
try{localStorage.removeItem(NestlingDB.legacyKey)}catch{}
render();toast(t("deleted"));
};
function notify(){if(!state.baby||state.active||!state.prefs.reminder)return;const p=forecast();if(!p.ready)return;const diff=p.target-now(),offset=Number(state.prefs.reminder)*MIN,key=p.target+"-"+offset;if(document.visibilityState==="visible"&&diff<=offset&&diff>0&&lastAlert!==key){lastAlert=key;toast(t(p.type==="Bedtime"?"bedtime":"nap")+" · "+fmt(p.target));if("Notification" in window&&Notification.permission==="granted")try{new Notification("Nestling",{body:t(p.type==="Bedtime"?"bedtime":"nap")+" · "+fmt(p.target)})}catch{}}}
$("#profile [name=reminder]").addEventListener("change",async()=>{if("Notification" in window&&Notification.permission==="default")await Notification.requestPermission().catch(()=>{})});
window.addEventListener("focus",()=>{if(!writeBlocked){render();notify()}});
window.addEventListener("pageshow",()=>{if(!writeBlocked){render();notify()}});
setInterval(()=>{if(state.baby&&!writeBlocked){render();notify()}},15000);
async function boot(){
try{
const result=await NestlingDB.init();state=result.state;
channel=typeof BroadcastChannel==="function"?new BroadcastChannel("nestling-updates"):null;
if(channel)channel.onmessage=()=>{document.querySelector("#tabNotice").hidden=false};
document.querySelector("#loading").remove();render();
if(result.migrated)toast(t("savedOld"));
if("serviceWorker" in navigator){
navigator.serviceWorker.register("./sw.js").then(reg=>{
const offer=()=>{if(reg.waiting&&navigator.serviceWorker.controller)$("#updateNotice").hidden=false};
offer();reg.addEventListener("updatefound",()=>{const worker=reg.installing;if(worker)worker.addEventListener("statechange",()=>{if(worker.state==="installed")offer()})});
}).catch(()=>{});
navigator.serviceWorker.addEventListener("controllerchange",()=>{if(window.__nestlingUpdating)location.reload()});
}
}catch(err){document.querySelector("#loading").textContent=t("noStorage")+": "+err.message+". Existing records were not deleted.";document.querySelector("#emergencyActions").hidden=false;document.querySelector("#loading").classList.remove("hide");}
}
$("#emergencyExport").onclick=()=>{try{const raw=localStorage.getItem(NestlingDB.legacyKey);if(!raw)throw Error(t("noLegacy"));const blob=new Blob([raw],{type:"application/json"}),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download="nestling-original-recovery.json";document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000)}catch(err){toast(err.message)}};
let deferredInstall=null;
window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();deferredInstall=event});
$("#installApp").onclick=async()=>{if(deferredInstall){deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;return}
toast(t("installGuide"));};
$("#activateUpdate").onclick=async()=>{await writes;navigator.serviceWorker?.ready.then(reg=>{if(reg.waiting){window.__nestlingUpdating=true;reg.waiting.postMessage({type:"ACTIVATE_UPDATE"})}})};
boot();
})();
