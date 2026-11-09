import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
const code=readFileSync(new URL("../schedule.js",import.meta.url),"utf8");
const context={window:{},Date,Math,Number,Array,Object};
runInNewContext(code,context);
const {getProfile,ageMonths,compute,profiles}=context.window.NestlingSchedule;
const local=(date,time)=>new Date(date+"T"+time+":00").getTime();
const dob="2026-05-09"; // 6 completed months on 2026-11-09
const now=local("2026-11-09","11:00");
const entry=(id,date,start,end)=>({id,start:local(date,start),end:local(date,end)});
test("PDF coverage has thirteen distinct age bands without gaps or overlaps",()=>{
 assert.equal(profiles.length,13);for(let m=0;m<84;m++)assert.ok(getProfile(m),String(m));
 assert.equal(getProfile(84),null);assert.equal(getProfile(-1),null);
});
test("PDF values: 4, 5, 6–7 and 8–9 month wake intervals",()=>{
 assert.deepEqual(Array.from(getProfile(4).wake),[90,120]);
 assert.deepEqual(Array.from(getProfile(5).wake),[105,135]);
 assert.deepEqual(Array.from(getProfile(6).wake),[150,180]);
 assert.deepEqual(Array.from(getProfile(8).wake),[180,225]);
 assert.deepEqual(Array.from(getProfile(6).naps),[2,3]);
});
test("source overlapping age boundaries use the newer band",()=>{
 assert.equal(getProfile(10).id,"10-11m");
 assert.equal(getProfile(12).id,"12-17m");
 assert.equal(getProfile(18).id,"18-23m");
 assert.equal(getProfile(24).id,"24-35m");
});
test("birthday boundary is calendar based, not days divided by 30",()=>{
 assert.equal(ageMonths("2026-05-09",now),6);
 assert.equal(ageMonths("2026-05-10",now),5);
 assert.equal(ageMonths("2026-02-30",now),null);
});
test("six-month next nap uses document reference midpoint before sufficient history",()=>{
 const data=compute({dob,sessions:[entry("a","2026-11-09","07:00","08:15")],now,bedtime:"19:30"});
 assert.equal(data.ready,true);assert.equal(data.type,"Nap");
 assert.equal(data.minutes,165);
 assert.equal(data.target,local("2026-11-09","11:00"));
 assert.equal(data.profile.id,"6-7m");assert.equal(data.calibrated,false);
});
test("records from an overnight session do not produce a daytime nap during night waking",()=>{
 const time=local("2026-11-09","03:30");
 const data=compute({dob,sessions:[{id:"a",start:local("2026-11-08","20:00"),end:local("2026-11-09","03:00")}],now:time,bedtime:"19:30"});
 assert.equal(data.ready,false);assert.equal(data.reasonKey,"nightWaking");
});
test("active timer suppresses all next-sleep forecasts",()=>{
 const data=compute({dob,sessions:[entry("a","2026-11-09","07:00","08:00")],active:{start:now-10000},now,bedtime:"19:30"});
 assert.equal(data.ready,false);assert.equal(data.reasonKey,"sleepProgress");
});
test("age not covered by PDF does not pretend a reference exists",()=>{
 const data=compute({dob:"2018-01-01",sessions:[],now,bedtime:"19:30"});
 assert.equal(data.ready,false);assert.equal(data.reasonKey,"ageUnsupported");
});
test("no logs does not fabricate a precise next sleep time",()=>{
 const data=compute({dob,sessions:[],now,bedtime:"19:30"});
 assert.equal(data.ready,false);assert.equal(data.reasonKey,"addCompleted");
});
test("incomplete recent history is flagged rather than learned",()=>{
 const data=compute({dob,sessions:[entry("a","2026-11-01","07:00","08:00")],now,bedtime:"19:30"});
 assert.equal(data.ready,false);assert.equal(data.reasonKey,"incomplete");
});
test("estimated interval remains inside source age bounds",()=>{
 const sessions=[];for(let day=2;day<=8;day++){
 const dt="2026-11-"+String(day).padStart(2,"0");
 sessions.push(entry("n"+day,dt,"06:00","07:00"),entry("m"+day,dt,"10:00","11:30"));
 }
 const p=compute({dob,sessions,now,bedtime:"19:30"});
 if(p.ready)assert.ok(p.minutes>=150&&p.minutes<=180);
});
