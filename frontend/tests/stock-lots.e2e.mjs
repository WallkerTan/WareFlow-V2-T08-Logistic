// Real Chrome + Chrome DevTools Protocol; no additional test dependency.
// Run with the Vite server active: node tests/stock-lots.e2e.mjs
import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:5173';
const chromePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = await mkdtemp(path.join(tmpdir(), 'wareflow-lots-test-'));
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', ...(process.env.CHROME_NO_SANDBOX === '1' ? ['--no-sandbox'] : []), '--remote-debugging-port=9335', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;

const errors = []; const keepAlive=setInterval(()=>{},1000);
try {
 let targets;
 for(let i=0;i<100;i++){try{targets=await(await fetch('http://127.0.0.1:9335/json')).json();break;}catch{await sleep(100);}}
 assert.ok(targets);
 socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
 let seq=0;const pending=new Map();
 function send(method,params={}){return new Promise((resolve,reject)=>{const id=++seq; const timer=setTimeout(()=>reject(Error(method+" timeout")),30000); pending.set(id,{resolve:r=>{clearTimeout(timer);resolve(r)},reject});socket.send(JSON.stringify({id,method,params}));});}
 socket.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p?.reject(Error(m.error.message));else p?.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);};
 async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;}
 async function until(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await sleep(70);}throw Error(expression);}
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
 await send('Page.navigate',{url:origin+'/storehouse/lots'});await until('!!document.querySelector(".sl-page")');
 assert.equal(await evaluate('document.querySelectorAll("tbody tr").length'),6);
 await evaluate('document.querySelector("button[aria-label=\"Trang sau\"]").click()');
 await until('document.querySelectorAll("tbody tr").length===3');
 await evaluate('document.querySelector("select[aria-label=\"Lọc trạng thái\"]").value="expired";document.querySelector("select[aria-label=\"Lọc trạng thái\"]").dispatchEvent(new Event("change",{bubbles:true}))');
 await until('document.querySelectorAll("tbody tr").length===1');
 assert.equal(await evaluate('document.querySelector("tbody").textContent.includes("LOT-004")'),true);
 await evaluate('document.querySelector(".sl-eye").click()');await until('!!document.querySelector(".sl-detail-grid")');
 assert.equal(await evaluate('document.querySelector(".sl-detail-grid").textContent.includes("Đã hết hạn")'),true);
 await evaluate('document.querySelector(".ant-modal-close").click()');
 await evaluate('document.querySelectorAll(".sl-tabs button")[1].click()');await until('!!document.querySelector(".sl-alerts")');
 assert.equal(await evaluate('document.querySelectorAll(".sl-alert").length'),8);
 await evaluate('document.querySelector(".sl-config").click()');await until('!!document.querySelector("#expiry-threshold")');
 await evaluate('document.querySelectorAll(".ant-modal-footer button")[0].click()');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
 await evaluate('document.querySelectorAll(".sl-tabs button")[0].click()');await until('!!document.querySelector(".sl-table-wrap")');
 assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
 assert.deepEqual(errors,[]);console.log('PASS: pagination, status filter, lot details, eight computed alerts, settings dialog, mobile overflow, no runtime errors');
}finally{clearInterval(keepAlive);socket?.close();chrome.kill();}


