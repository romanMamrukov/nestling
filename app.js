
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
writes=writes.then(async()=>{await NestlingDB.replace(snapshot);channel?.postMessage({changed:true});return true}).catch(err=>{writeBlocked=true;const warning=document.querySelector("#storageError");warning.hidden=false;warning.textContent="Cannot save changes: "+err.message+". Stop editing and export a backup. Reload only after securing your records.";toast("Save failed: "+err.message);return false});
return writes;}
function applyLanguage(){state.prefs.language=NestlingLocale.valid(state.prefs.language);NestlingLocale.apply(state.prefs.language)}
$("#headerLanguage").addEventListener("change",e=>{if(writeBlocked)return;state.prefs.language=NestlingLocale.valid(e.target.value);save();render()});
function toast(s){const x=$("#toast");x.textContent=s;x.style.display="block";clearTimeout(toast.timer);toast.timer=setTimeout(()=>x.style.display="none",3000)}
const age=()=>{const d=state.baby?.dob;if(!d)return 0;const a=new Date(d+"T12:00:00"),b=new Date();return Math.max(0,12*(b.getFullYear()-a.getFullYear())+b.getMonth()-a.getMonth()-(b.getDate()<a.getDate()?1:0))};
const bands=[{max:1,min:35,ideal:55,high:75},{max:2,min:50,ideal:75,high:105},{max:3,min:65,ideal:90,high:120},{max:4,min:75,ideal:105,high:135},{max:5,min:90,ideal:120,high:150},{max:6,min:105,ideal:145,high:180},{max:8,min:125,ideal:170,high:210},{max:10,min:150,ideal:195,high:240},{max:12,min:165,ideal:210,high:255},{max:15,min:180,ideal:235,high:300},{max:18,min:210,ideal:270,high:330},{max:24,min:240,ideal:310,high:360},{max:36,min:270,ideal:345,high:390},{max:59,min:300,ideal:360,high:480}];
const guidance=m=>m<4?[14,17,"Newborn sleep varies widely; no precise nap timing guidance is medically validated."]:m<12?[12,16,"AASM sleep duration guidance, 4–12 months"]:m<36?[11,14,"AASM sleep duration guidance, 1–2 years"]:[10,13,"AASM sleep duration guidance, 3–5 years"];
const median=xs=>{let a=xs.slice().sort((x,y)=>x-y);return a.length?(a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2):null};
function cleanSessions(){let rows=state.sessions.filter(s=>Number.isFinite(+s.start)&&Number.isFinite(+s.end)&&s.start<s.end&&s.end<=now()+MIN&&s.end-s.start<=18*3600000).sort((a,b)=>a.start-b.start);let out=[];for(let s of rows)if(!out.length||s.start>=out.at(-1).end)out.push(s);return out}
function sleepBetween(a,b){return cleanSessions().reduce((v,s)=>v+Math.max(0,Math.min(b,s.end)-Math.max(a,s.start))/MIN,0)}
function isNight(s){let t=new Date(s.start),hm=t.getHours()*60+t.getMinutes(),[h,m]=state.prefs.bedtime.split(":").map(Number),bt=h*60+m,delta=Math.abs(((hm-bt+2160)%1440)-720);return(s.end-s.start)/MIN>=240||delta<=150||hm<300}
function forecast(){const rows=cleanSessions(),a=age(),b=bands.find(x=>a<=x.max)||bands.at(-1),last=rows.at(-1);if(!last||state.active)return{ready:false,reasonKey:state.active?"sleepProgress":"addCompleted",rows};let awake=now()-last.end;if(awake>20*3600000)return{ready:false,reasonKey:"incomplete",rows};let gaps=[];for(let i=1;i<rows.length;i++){const next=rows[i],gap=(next.start-rows[i-1].end)/MIN;if(now()-next.end<21*DAY&&!isNight(next)&&gap>=b.min*.55&&gap<=b.high*1.65)gaps.push(gap)}let recent=gaps.slice(-12),pers=median(recent),w=pers===null?0:Math.min(.4,recent.length/20),wake=Math.round(Math.max(b.min,Math.min(b.high,b.ideal*(1-w)+(pers??b.ideal)*w)));let t=last.end+wake*MIN,baseDay=new Date(),[hh,mm]=state.prefs.bedtime.split(":").map(Number);baseDay.setHours(hh,mm,0,0);let bed=+baseDay;if(bed<now()-180*MIN)bed+=DAY;const lh=new Date(last.end).getHours();if(lh>=20||lh<5)return{ready:false,reasonKey:"nightWaking",rows};let type=bed>=last.end+Math.max(30,b.min*.5)*MIN&&bed<=t+75*MIN?"Bedtime":"Nap";if(type==="Bedtime")t=bed;
let errors=[];for(let i=2;i<rows.length;i++){let actual=rows[i],prev=rows[i-1];if(isNight(actual))continue;let gap=(actual.start-prev.end)/MIN;if(gap>=b.min*.55&&gap<=b.high*1.65)errors.push(Math.abs(gap-b.ideal))}const e=errors.slice(-30),mae=e.length?Math.round(e.reduce((x,y)=>x+y,0)/e.length):null;let sorted=e.slice().sort((x,y)=>x-y);let half=sorted.length>=8?sorted[Math.ceil(.8*sorted.length)-1]:recent.length>=4?45:65;half=Math.max(20,Math.min(120,half));return{ready:true,type,target:t,earliest:t-half*MIN,latest:t+half*MIN,minutes:wake,history:recent.length,mae,samples:e.length,half,rows}}
function render(){applyLanguage();if(!state.baby){$("#welcome").classList.remove("hide");$("#main").classList.add("hide");$("#setup [name=dob]").max=new Date().toISOString().slice(0,10);return}$("#welcome").classList.add("hide");$("#main").classList.remove("hide");$("#greeting").textContent=state.baby.name;$("#age").textContent=age()+" "+t("ageMonths");const p=forecast(),rows=p.rows||cleanSessions(),ts=now(),start=new Date();start.setHours(0,0,0,0);
$("#todayTotal").textContent=dur(sleepBetween(+start,ts)+(state.active?Math.max(0,(ts-Math.max(state.active.start,+start))/MIN):0));$("#todayCount").textContent=rows.filter(s=>s.end>+start).length;$("#lastWake").textContent=rows.length?fmt(rows.at(-1).end):"—";$("#rollingTotal").textContent=dur(sleepBetween(ts-DAY,ts));let g=guidance(age());$("#guidance").textContent=t("recorded")+": "+dur(sleepBetween(ts-DAY,ts))+". "+t("population")+": "+g[0]+"–"+g[1]+" "+t("hours")+"/24h. "+t(age()<4?"guideNewborn":age()<12?"guideAasmInfant":age()<36?"guideAasmToddler":"guideAasmChild")+". "+t("missing");
$("#forecast").textContent=state.active?t("sleeping")+" · "+dur((ts-state.active.start)/MIN):p.ready?fmt(p.target):t(p.reasonKey||"addPrompt");$("#range").textContent=p.ready?t(p.type==="Bedtime"?"bedtime":"nap")+" · "+fmt(p.earliest)+" – "+fmt(p.latest):t("needsRecord");$("#forecastNote").textContent=p.ready?p.history+" "+t("usedIntervals")+". "+t(p.samples>=8?"pastNotValidated":"notCalibrated"):t("noSubstitute");$("#toggleSleep").textContent=t(state.active?"stopSleep":"startSleep");
const entry=s=>'<div class="entry"><div><strong>'+fdate(s.start)+' · '+fmt(s.start)+'–'+fmt(s.end)+'</strong><small>'+dur((s.end-s.start)/MIN)+' · '+t(isNight(s)?"nightEstimated":"napEstimated")+'</small></div><div class="actions" style="margin:0"><button data-edit="'+escapeHTML(s.id)+'">'+t("edit")+'</button><button data-delete="'+escapeHTML(s.id)+'" style="color:#a03d35">'+t("delete")+'</button></div></div>';
$("#recent").innerHTML=rows.slice(-4).reverse().map(entry).join("")||'<p class="muted">'+t("noRecent")+'</p>';$("#historyEntries").innerHTML=rows.slice().reverse().map(entry).join("")||'<p class="muted">'+t("noRecords")+'</p>';
let bars=[];for(let i=6;i>=0;i--){let d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i);let end=new Date(d);end.setDate(end.getDate()+1);bars.push({label:d.toLocaleDateString(undefined,{weekday:"short"}),hours:sleepBetween(+d,Math.min(+end,ts))/60})}$("#bars").innerHTML=bars.map(v=>'<div class="barcol"><span>'+v.hours.toFixed(1)+'h</span><div class="bar" style="height:'+Math.min(100,v.hours/17*100)+'%"></div><span>'+v.label+'</span></div>').join("");
$("#predictionDetails").innerHTML='<div class="stat">'+t("ageLabel")+": "+age()+" "+t("ageMonths")+"<br>"+t("estimatedInterval")+": "+(p.minutes??"—")+" "+t("minutes")+"<br>"+t("historicalIntervals")+": "+(p.history??0)+"<br>"+t("retrospective")+": "+(p.samples??0)+"<br>"+t("errorProxy")+": "+(p.mae==null?t("notAvailable"):p.mae+" "+t("minutes"))+'</div><div class="notice">'+t("heuristicNotice")+'</div>';
$("#profile [name=name]").value=state.baby.name;$("#profile [name=dob]").value=state.baby.dob;$("#profile [name=dob]").max=new Date().toISOString().slice(0,10);$("#profile [name=bedtime]").value=state.prefs.bedtime;$("#profile [name=reminder]").value=state.prefs.reminder;$("#profile [name=language]").value=state.prefs.language;
}
function validRange(start,end,ignore=null){if(!(start<end)||end>now()+MIN||end-start>18*3600000)return t("invalidRange");if(cleanSessions().some(s=>s.id!==ignore&&start<s.end&&end>s.start))return t("overlap");return""}
function localValue(t){let d=new Date(t),off=d.getTimezoneOffset()*MIN;return new Date(t-off).toISOString().slice(0,16)}
function openEntry(id){const s=state.sessions.find(x=>x.id===id);$("#dialogTitle").textContent=t(s?"editSleep":"addSleep");let f=$("#entryForm");f.elements.id.value=s?.id||"";f.elements.start.value=localValue(s?.start??now()-60*MIN);f.elements.end.value=localValue(s?.end??now());$("#entryDialog").showModal()}
$("#setup").onsubmit=e=>{e.preventDefault();if(writeBlocked)return;const f=e.target;if(+new Date(f.elements.dob.value+"T12:00")>now())return toast(t("birthFuture"));state.baby={name:f.elements.name.value.trim(),dob:f.elements.dob.value};state.prefs.bedtime=f.elements.bedtime.value;save();render()};
$("#profile").onsubmit=e=>{e.preventDefault();if(writeBlocked)return;let f=e.target;if(+new Date(f.elements.dob.value+"T12:00")>now())return toast(t("birthFuture"));state.baby={name:f.elements.name.value.trim(),dob:f.elements.dob.value};state.prefs={bedtime:f.elements.bedtime.value,reminder:Number(f.elements.reminder.value),language:NestlingLocale.valid(f.elements.language.value)};lastAlert="";save();render();toast(t("settingsSaved"))};
$("#toggleSleep").onclick=()=>{if(writeBlocked)return;if(!state.active){state.active={start:now()};save();render();return}let start=state.active.start,end=now();if(end-start<MIN)return toast(t("tooShort"));const error=validRange(start,end);if(error)return toast(error);state.sessions.push({id:crypto.randomUUID(),start,end});state.active=null;save();render();toast(t("sleepRecorded"))};
$("#entryForm").onsubmit=e=>{e.preventDefault();if(writeBlocked)return;const f=e.target,start=+new Date(f.elements.start.value),end=+new Date(f.elements.end.value),id=f.elements.id.value;let error=validRange(start,end,id);if(error)return toast(error);if(id){const row=state.sessions.find(s=>s.id===id);if(!row)return toast(t("entryMissing"));row.start=start;row.end=end}else state.sessions.push({id:crypto.randomUUID(),start,end});save();$("#entryDialog").close();render();toast(t("sleepSaved"))};
$("#cancelDialog").onclick=()=>$("#entryDialog").close();
$("#addEntry").onclick=()=>openEntry();$("#historyAdd").onclick=()=>openEntry();$("#allHistory").onclick=()=>setTab("history");
document.addEventListener("click",e=>{if(writeBlocked)return;const edit=e.target.closest("[data-edit]");if(edit)openEntry(edit.dataset.edit);const del=e.target.closest("[data-delete]");if(del){const id=del.dataset.delete;if(confirm(t("deleteConfirm"))){state.sessions=state.sessions.filter(s=>s.id!==id);save();render();toast(t("sleepDeleted"))}}});
function setTab(name){$$(".tabs button").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));["dashboard","history","insights","settings"].forEach(t=>$("#"+t).classList.toggle("hide",t!==name))}
$$(".tabs button").forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
$("#export").onclick=()=>{try{NestlingBackup.download(NestlingBackup.envelope(state),"nestling-backup-"+new Date().toISOString().slice(0,10)+".json");toast("Backup downloaded")}catch(err){toast(err.message)}};
$("#exportEncrypted").onclick=async()=>{try{
const password=prompt("Create a backup password (12+ characters). It cannot be recovered.");if(password===null)return;
const verify=prompt("Repeat the backup password");if(verify===null)return;
if(password!==verify)throw Error("Passwords do not match");
const data=await NestlingBackup.encrypt(state,password);NestlingBackup.download(data,"nestling-encrypted-"+new Date().toISOString().slice(0,10)+".json");
toast("Encrypted backup downloaded");}catch(err){toast(err.message)}};
$("#persist").onclick=async()=>{try{const ok=await NestlingDB.requestPersistence();toast(ok?"Persistent storage granted":"Browser did not grant persistent storage")}catch(err){toast(err.message)}};
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
render();toast("Local records deleted");
};
function notify(){if(!state.baby||state.active||!state.prefs.reminder)return;const p=forecast();if(!p.ready)return;const diff=p.target-now(),offset=Number(state.prefs.reminder)*MIN,key=p.target+"-"+offset;if(document.visibilityState==="visible"&&diff<=offset&&diff>0&&lastAlert!==key){lastAlert=key;toast(t(p.type==="Bedtime"?"bedtime":"nap")+" · "+fmt(p.target));if("Notification" in window&&Notification.permission==="granted")new Notification("Nestling",{body:t(p.type==="Bedtime"?"bedtime":"nap")+" · "+fmt(p.target)})}}
$("#profile [name=reminder]").addEventListener("change",async()=>{if("Notification" in window&&Notification.permission==="default")await Notification.requestPermission()});
window.addEventListener("focus",()=>{if(!writeBlocked){render();notify()}});
window.addEventListener("pageshow",()=>{if(!writeBlocked){render();notify()}});
setInterval(()=>{if(state.baby&&!writeBlocked){render();notify()}},15000);
async function boot(){
try{
const result=await NestlingDB.init();state=result.state;
channel=typeof BroadcastChannel==="function"?new BroadcastChannel("nestling-updates"):null;
if(channel)channel.onmessage=()=>{document.querySelector("#tabNotice").hidden=false};
document.querySelector("#loading").remove();render();
if(result.migrated)toast("Sleep records migrated safely. Original browser copy preserved.");
if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
}catch(err){document.querySelector("#loading").textContent="Unable to load Nestling data: "+err.message+". Existing local records were not deleted.";document.querySelector("#loading").classList.remove("hide");}
}
boot();
})();
