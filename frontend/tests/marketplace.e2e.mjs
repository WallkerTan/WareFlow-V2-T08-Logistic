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
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', ...(process.env.CHROME_NO_SANDBOX === '1' ? ['--no-sandbox'] : []), '--remote-debugging-port=9237', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
const checks = [];
const errors = []; const keepAlive=setInterval(()=>{},1000);
try {
 let targets;
 for(let i=0;i<100;i++){try{targets=await(await fetch('http://127.0.0.1:9237/json')).json();break;}catch{await sleep(100);}}
 assert.ok(targets);
 socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
 let seq=0;const pending=new Map();
 function send(method,params={}){return new Promise((resolve,reject)=>{const id=++seq; const timer=setTimeout(()=>reject(Error(method+" timeout")),30000); pending.set(id,{resolve:r=>{clearTimeout(timer);resolve(r)},reject});socket.send(JSON.stringify({id,method,params}));});}
 socket.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p?.reject(Error(m.error.message));else p?.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);};
 async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;}
 async function until(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await sleep(70);}throw Error(expression);}
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
 await send('Page.navigate',{url:origin+'/company/marketplace'});
 await until('document.querySelectorAll(".market-card").length===3');
 await evaluate('document.querySelectorAll(".market-card-actions button")[1].click()');
 await until('!!document.querySelector(".market-modal form")');
 await evaluate('document.querySelector(".market-modal form").requestSubmit()');
 await until('!!document.querySelector(".market-success")');
 assert.equal(await evaluate('JSON.parse(localStorage.getItem("wareflow-offers-v1")).length'),1);
 assert.equal(await evaluate('document.querySelectorAll(".market-card-actions button")[1].disabled'),true);
 await send('Page.reload');
 await until('document.querySelectorAll(".market-card").length===3');
 assert.equal(await evaluate('document.querySelectorAll(".market-card-actions button")[1].disabled'),true);
 await evaluate('document.querySelectorAll(".market-tabs button")[1].click()');
 await until('document.querySelectorAll(".market-offers article").length===1');
 await evaluate('document.querySelectorAll(".market-tabs button")[0].click()');
 await evaluate('const s=document.querySelector(".market-filter-row select");s.value="Miền Bắc";s.dispatchEvent(new Event("change",{bubbles:true}));');
 await until('document.querySelectorAll(".market-card").length===1');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'),true);
 assert.deepEqual(errors,[]);
 console.log('PASS listing, region filter, submit, duplicate prevention, persistence, offer history, mobile layout, no runtime errors');
}finally{clearInterval(keepAlive);socket?.close();chrome.kill();}
