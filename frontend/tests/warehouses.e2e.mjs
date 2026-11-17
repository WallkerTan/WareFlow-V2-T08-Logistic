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
 await until('!!document.querySelector(".wm-detail")');
 await evaluate('document.querySelector(".wm-detail .wm-primary").click()');
 await until('document.querySelectorAll(".wm-depot").length===1');
 assert.equal(await evaluate('JSON.parse(localStorage.getItem("wareflow-depots-v1")).find(d=>d.id==="WH-003").status'),'active');
 console.log('PASS approval updates data and pending filter');
 await evaluate('document.querySelector(".wm-heading .wm-primary").click()');
 await until('!!document.querySelector(".wm-form")');
 await evaluate('document.querySelector("input[name=name]").value="Kho test";document.querySelector("input[name=address]").value="Can Tho";document.querySelector("input[name=area]").value="500";document.querySelector("input[name=price]").value="20";document.querySelector(".wm-form").requestSubmit()');
 await until('JSON.parse(localStorage.getItem("wareflow-depots-v1")).length===9');
 await until('!document.querySelector(".wm-form")');
 console.log('PASS add warehouse and persistence');
 await evaluate('document.querySelectorAll(".wm-view button")[1].click()');
 await until('!!document.querySelector(".wm-list")');
 await send('Page.reload');await until('!!document.querySelector(".wm-page")');
 assert.equal(await evaluate('document.querySelector(".wm-directory-title h2 span").textContent'),'9 kho');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
 console.log('PASS persistence after reload, list view, mobile overflow');
 await send('Emulation.clearDeviceMetricsOverride');
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
 await sleep(1500);
 const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
 const {writeFile}=await import('node:fs/promises');await writeFile('tests/warehouses-desktop.png',Buffer.from(shot.data,'base64'));
 assert.deepEqual(errors,[]);console.log('PASS no runtime exceptions');
}finally{clearInterval(keepAlive);socket?.close();chrome.kill();}

