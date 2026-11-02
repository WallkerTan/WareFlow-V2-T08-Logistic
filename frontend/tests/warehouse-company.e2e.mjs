// Real Chrome + Chrome DevTools Protocol; no additional test dependency.
// Run with the Vite server active: node tests/profiles.e2e.mjs
import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:5173';
const chromePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = await mkdtemp(path.join(tmpdir(), 'wareflow-auth-test-'));
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', ...(process.env.CHROME_NO_SANDBOX === '1' ? ['--no-sandbox'] : []), '--remote-debugging-port=9223', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
const checks = [];
const errors = []; const keepAlive=setInterval(()=>{},1000);
try {
 let targets;
 for(let i=0;i<100;i++){try{targets=await(await fetch('http://127.0.0.1:9223/json')).json();break;}catch{await sleep(100);}}
 assert.ok(targets);
 socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
 let seq=0;const pending=new Map();
 function send(method,params={}){return new Promise((resolve,reject)=>{const id=++seq; const timer=setTimeout(()=>reject(Error(method+" timeout")),10000); pending.set(id,{resolve:r=>{clearTimeout(timer);resolve(r)},reject});socket.send(JSON.stringify({id,method,params}));});}
 socket.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p?.reject(Error(m.error.message));else p?.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);};
 async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;}
 async function until(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await sleep(70);}throw Error(expression);}
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
 await send('Page.navigate',{url:origin+'/wareflow/warehouses'});
 await until('document.querySelectorAll(".wm-depot").length===6');
 await evaluate('document.querySelectorAll(".wm-tabs button")[3].click()');
 await until('document.querySelectorAll(".wm-depot").length===2');
 await evaluate('document.querySelector(".wm-depot-footer button").click()');
 await until('!!document.querySelector(".wm-detail .wm-primary")');
 await evaluate('document.querySelector(".wm-detail .wm-primary").click()');
 await until('document.querySelectorAll(".wm-depot").length===1');
 const company=await evaluate('JSON.parse(localStorage.getItem("wareflow-depots-v1")).find(w=>w.id==="WH-003").company');
 await send('Page.navigate',{url:origin+'/company/warehouses?company='+encodeURIComponent(company)});
 await until('!!document.querySelector(".wf-profile-banner")');
 assert.equal(await evaluate('document.querySelector(".wf-card article").textContent.includes("WH-003")'),true);
 assert.equal(await evaluate('document.querySelectorAll(".wf-card article").length'),1);
 await evaluate('document.querySelector(".wf-card article button").click()');
 await until('!!document.querySelector(".ant-modal-body")');
 assert.equal(await evaluate('document.querySelector(".ant-modal-body").textContent.includes("WH-003")'),true);
 console.log('PASS actual approval appears under correct company with details');
 await send('Page.reload');await until('!!document.querySelector(".wf-card article")');
 assert.equal(await evaluate('document.querySelector(".wf-card article").textContent.includes("WH-003")'),true);
 // Modify shared data in a real second tab; the already open company page must update.
 const target=await send('Target.createTarget',{url:origin+'/company/warehouses'});
 let targetInfo;
 for(let i=0;i<50;i++){targetInfo=(await(await fetch('http://127.0.0.1:9223/json')).json()).find(t=>t.id===target.targetId);if(targetInfo)break;await sleep(100);}
 const other=new WebSocket(targetInfo.webSocketDebuggerUrl);await new Promise(r=>other.onopen=r);
 await new Promise((resolve,reject)=>{other.onmessage=({data})=>{const r=JSON.parse(data);if(r.id===1){if(r.error||r.result?.exceptionDetails)reject(Error(JSON.stringify(r)));else resolve();}};other.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression:'const rows=JSON.parse(localStorage.getItem("wareflow-depots-v1"));rows.find(w=>w.id==="WH-003").status="returned";localStorage.setItem("wareflow-depots-v1",JSON.stringify(rows));'}}));});
 await until('document.querySelectorAll(".wf-card article").length===0');
 other.close();await send('Target.closeTarget',{targetId:target.targetId});
 console.log('PASS real cross-tab updates without reload; returned warehouse removed');
 await evaluate('const s=document.querySelector("select");s.value=[...s.options].find(o=>o.value.endsWith("GreenMart")).value;s.dispatchEvent(new Event("change",{bubbles:true}));');
 await until('document.querySelectorAll(".wf-card article").length===1');
 assert.equal(await evaluate('document.querySelector(".wf-card article").textContent.includes("WH-001")'),true);
 assert.equal(await evaluate('document.querySelector(".wf-card article").textContent.includes("WH-003")'),false);
 console.log('PASS company isolation and company selector');
 assert.deepEqual(errors,[]);
}finally{clearInterval(keepAlive);socket?.close();chrome.kill();}
