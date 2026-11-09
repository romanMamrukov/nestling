/* Nestling age-informed schedule profile.
   Source: Unimums, "Время бодрствования и сна, таблица режима", p.2.
   These are educational schedule estimates, NOT clinical wake-window standards.
   Age intervals use completed calendar months, [minMonths,maxMonths).
   Source overlaps at 10/12/18/24 months: the next band's lower bound wins. */
(function(root){
"use strict";
const DAY=86400000,MIN=60000;
const rows=[
{id:"under-1m",minMonths:0,maxMonths:1,wake:[20,50],naps:[4,8],napDuration:[15,240],daySleep:[360,600],nightSleep:[480,600],total:[960,1200]},
{id:"1-2m",minMonths:1,maxMonths:3,wake:[50,80],naps:[4,5],napDuration:[30,120],daySleep:[360,480],nightSleep:[600,720],total:[840,1020]},
{id:"3m",minMonths:3,maxMonths:4,wake:[80,100],naps:[3,4],napDuration:[30,120],daySleep:[300,360],nightSleep:[600,720],total:[840,1020]},
{id:"4m",minMonths:4,maxMonths:5,wake:[90,120],naps:[3,4],napDuration:[30,120],daySleep:[240,300],nightSleep:[600,720],total:[840,960]},
{id:"5m",minMonths:5,maxMonths:6,wake:[105,135],naps:[3,3],napDuration:[30,120],daySleep:[180,240],nightSleep:[600,720],total:[780,960]},
{id:"6-7m",minMonths:6,maxMonths:8,wake:[150,180],naps:[2,3],napDuration:[60,120],daySleep:[180,240],nightSleep:[600,720],total:[780,900]},
{id:"8-9m",minMonths:8,maxMonths:10,wake:[180,225],naps:[2,2],napDuration:[60,120],daySleep:[120,180],nightSleep:[660,720],total:[780,900]},
{id:"10-11m",minMonths:10,maxMonths:12,wake:[210,270],naps:[1,2],napDuration:[60,120],daySleep:[120,180],nightSleep:[660,720],total:[780,840]},
{id:"12-17m",minMonths:12,maxMonths:18,wake:[240,330],naps:[1,2],napDuration:[60,120],daySleep:[90,180],nightSleep:[660,720],total:[750,780]},
{id:"18-23m",minMonths:18,maxMonths:24,wake:[240,360],naps:[1,1],napDuration:[60,120],daySleep:[60,120],nightSleep:[660,720],total:[720,780]},
{id:"24-35m",minMonths:24,maxMonths:36,wake:[240,360],naps:[1,1],napDuration:[60,120],daySleep:[60,120],nightSleep:[660,720],total:[720,780]},
{id:"36-47m",minMonths:36,maxMonths:48,wake:[300,360],naps:[0,1],napDuration:[60,120],daySleep:[60,120],nightSleep:[600,660],total:[720,720]},
{id:"48-83m",minMonths:48,maxMonths:84,wake:[360,360],naps:[0,1],napDuration:[60,120],daySleep:[60,120],nightSleep:[600,660],total:[600,780]}
];
const profiles=Object.freeze(rows.map(r=>Object.freeze({...r,wake:Object.freeze(r.wake),naps:Object.freeze(r.naps),napDuration:Object.freeze(r.napDuration),daySleep:Object.freeze(r.daySleep),nightSleep:Object.freeze(r.nightSleep),total:Object.freeze(r.total)})));
function getProfile(m){return Number.isInteger(m)&&m>=0?profiles.find(r=>m>=r.minMonths&&m<r.maxMonths)||null:null}
function ageMonths(dob,now=Date.now()){
if(typeof dob!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(dob))return null;
const [year,month,day]=dob.split("-").map(Number),birth=new Date(year,month-1,day,12);
if(birth.getFullYear()!==year||birth.getMonth()!==month-1||birth.getDate()!==day||birth.getTime()>now)return null;
const d=new Date(now),n=(d.getFullYear()-year)*12+d.getMonth()-(month-1)-(d.getDate()<day?1:0);return Math.max(0,n)}
const median=a=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2};
const percentile=(a,q)=>{const s=[...a].sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.max(0,Math.ceil(q*s.length)-1))]};
const timeMinute=ms=>{let d=new Date(ms);return d.getHours()*60+d.getMinutes()};
const circularDistance=(a,b)=>Math.abs(((a-b+2160)%1440)-720);
function nightLike(s,bedtime){const t=timeMinute(s.start),d=(s.end-s.start)/MIN,bed=bedtime[0]*60+bedtime[1];return d>=240||circularDistance(t,bed)<=120||t<300}
function validateRows(rows,now){if(!Array.isArray(rows))return[];return rows.filter(s=>s&&Number.isFinite(s.start)&&Number.isFinite(s.end)&&s.start<s.end&&s.end<=now+MIN&&s.end-s.start<=18*60*MIN).slice().sort((a,b)=>a.start-b.start).filter((s,i,a)=>i===0||s.start>=a[i-1].end)}
function totals(rows,now,bedtime){const from=now-DAY,all=rows.reduce((t,s)=>t+Math.max(0,Math.min(now,s.end)-Math.max(from,s.start))/MIN,0);let days=rows.filter(s=>s.end>from&&s.start<now&&!nightLike(s,bedtime));let napDuration=days.reduce((t,s)=>t+Math.max(0,Math.min(now,s.end)-Math.max(from,s.start))/MIN,0);return{total24:Math.round(all),day24:Math.round(napDuration)}}
function morningReference(now,bedtime){const d=new Date(now);d.setHours(bedtime[0],bedtime[1],0,0);if(+d<now-90*MIN)d.setDate(d.getDate()+1);return+d}
function compute(input){
const at=Number.isFinite(input?.now)?input.now:Date.now(),m=ageMonths(input?.dob,at),profile=getProfile(m);
if(!profile)return{ready:false,reasonKey:"ageUnsupported",ageMonths:m,profile:null,rows:[]};
const b=typeof input.bedtime==="string"&&/^([01]\d|2[0-3]):[0-5]\d$/.test(input.bedtime)?input.bedtime:"19:30",clock=b.split(":").map(Number);
const rows=validateRows(input.sessions,at);const summary=totals(rows,at,clock);
if(input.active)return{ready:false,reasonKey:"sleepProgress",profile,rows,summary,ageMonths:m};
if(!rows.length)return{ready:false,reasonKey:"addCompleted",profile,rows,summary,ageMonths:m};
const last=rows.at(-1),awake=(at-last.end)/MIN;
if(awake>20*60)return{ready:false,reasonKey:"incomplete",profile,rows,summary,ageMonths:m};
const lastEnd=timeMinute(last.end);
if(lastEnd>=20*60||lastEnd<5*60)return{ready:false,reasonKey:"nightWaking",profile,rows,summary,ageMonths:m};
const low=profile.wake[0],high=profile.wake[1],prior=(low+high)/2;
const observed=[];
for(let i=1;i<rows.length;i++){
  const next=rows[i],prev=rows[i-1],gap=(next.start-prev.end)/MIN;
  if(at-next.end>21*DAY||nightLike(next,clock)||gap<low*.6||gap>high*1.5)continue;
  observed.push({gap,time:next.start,prevEnd:prev.end});
}
const recent=observed.slice(-14),history=recent.map(x=>x.gap),personal=median(history);
const alpha=history.length>=8?.55:history.length>=4?.35:history.length>=2?.2:0;
const desired=Math.max(low,Math.min(high,prior*(1-alpha)+(personal??prior)*alpha));
const estimated=last.end+Math.round(desired)*MIN;
const bed=morningReference(at,clock);
const todayStart=new Date(at);todayStart.setHours(0,0,0,0);
const napCount=rows.filter(s=>s.start>=+todayStart&&s.start<at&&!nightLike(s,clock)).length;
// Avoid producing an extra nap prediction once the reference nap count is reached.
let type="Nap",target=estimated;
if((napCount>=profile.naps[1]&&bed>last.end+30*MIN)||(bed>=last.end+low*.5*MIN&&bed<=estimated+60*MIN)){type="Bedtime";target=bed;}
const residuals=[];
for(let i=2;i<observed.length;i++){
 const earlier=observed.slice(Math.max(0,i-8),i).map(x=>x.gap);
 const a=earlier.length>=5?.4:earlier.length>=2?.2:0;
 const estimate=Math.max(low,Math.min(high,prior*(1-a)+(median(earlier)??prior)*a));
 residuals.push(Math.abs(observed[i].gap-estimate));
}
const errors=residuals.slice(-30),mae=errors.length?Math.round(errors.reduce((a,b)=>a+b,0)/errors.length):null;
// Empirical coverage is unvalidated with fewer than 8 scored past samples.
const span=errors.length>=8?Math.max(15,Math.min(120,Math.ceil(percentile(errors,.8)))):null;
let earliest,latest;
if(type==="Bedtime"){const range=span??45;earliest=target-range*MIN;latest=target+range*MIN;}
else {const midRange=Math.max((high-low)/2,20);const radius=span??midRange;earliest=last.end+Math.max(low,desired-radius)*MIN;latest=last.end+Math.min(high,desired+radius)*MIN;}
if(at>latest+30*MIN)return{ready:false,reasonKey:"windowPassed",profile,rows,summary,ageMonths:m,napCount};
return{ready:true,rows,profile,summary,ageMonths:m,napCount,type,target,earliest,latest,minutes:Math.round(desired),history:history.length,samples:errors.length,mae,calibrated:span!==null,source:"unimums-p2",referenceOnly:m<4};
}
root.NestlingSchedule={profiles,getProfile,ageMonths,compute};
})(typeof window!=="undefined"?window:globalThis);
