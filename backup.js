/* Versioned portable backups. Encryption: PBKDF2-SHA256 and AES-256-GCM. */
(()=>{
"use strict";
const encoder=new TextEncoder(),decoder=new TextDecoder(),ITER=310000,MAX=5_000_000;
const b64=bytes=>{let s="";for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s)};
const unb64=str=>Uint8Array.from(atob(str),c=>c.charCodeAt(0));
function envelope(data){return{format:"nestling-backup",version:3,createdAt:new Date().toISOString(),data:NestlingDB.check(data)}}
function read(obj){if(!obj||typeof obj!=="object")throw Error("Invalid backup");
if(obj.format==="nestling-backup"&&obj.version===3)return NestlingDB.check(obj.data);
if(Array.isArray(obj.sessions)&&obj.prefs)return NestlingDB.check(obj);
throw Error("Unsupported backup format");}
async function key(password,salt){const base=await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveKey"]);return crypto.subtle.deriveKey({name:"PBKDF2",hash:"SHA-256",salt,iterations:ITER},base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"])}
async function encrypt(data,password){if(typeof password!=="string"||password.length<12)throw Error("Passphrase must contain at least 12 characters");
const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),k=await key(password,salt),clear=encoder.encode(JSON.stringify(envelope(data)));const cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv},k,clear);
return{format:"nestling-encrypted-backup",version:1,kdf:{name:"PBKDF2",hash:"SHA-256",iterations:ITER,salt:b64(salt)},cipher:{name:"AES-256-GCM",iv:b64(iv)},ciphertext:b64(new Uint8Array(cipher))};}
async function decrypt(obj,password){if(!obj||obj.format!=="nestling-encrypted-backup"||obj.version!==1||obj.kdf?.name!=="PBKDF2"||obj.kdf.hash!=="SHA-256"||obj.kdf.iterations!==ITER||obj.cipher?.name!=="AES-256-GCM")throw Error("Invalid encrypted backup");
const salt=unb64(obj.kdf.salt),iv=unb64(obj.cipher.iv),cipher=unb64(obj.ciphertext);
if(salt.length!==16||iv.length!==12||cipher.length>MAX)throw Error("Invalid encryption parameters");
try{const k=await key(password,salt),plain=await crypto.subtle.decrypt({name:"AES-GCM",iv},k,cipher);return read(JSON.parse(decoder.decode(plain)))}catch{throw Error("Unable to decrypt backup. Check the password and file integrity.")}}
function download(obj,filename){let b=new Blob([JSON.stringify(obj,null,2)],{type:"application/json"}),url=URL.createObjectURL(b),a=document.createElement("a");a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000)}
window.NestlingBackup={envelope,read,encrypt,decrypt,download};
})();