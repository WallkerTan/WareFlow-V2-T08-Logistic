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
 for(const route of ['/company/profile','/storehouse/profile','/wareflow/profile']){
  await send('Page.navigate',{url:origin+route});await until('!!document.querySelector(".wf-profile-form")');
  assert.equal(await evaluate('document.querySelectorAll("input:not([readonly])").length>0'),true);
  assert.equal(await evaluate('[...document.querySelectorAll("input,textarea,select")].every(e=>!e.value)'),true);
  await evaluate('document.querySelector("input:not([readonly])").value="Temporary entry";document.querySelector(".wf-button-secondary").click()');
  assert.equal(await evaluate('document.querySelector("input:not([readonly])").value'),'');
  await evaluate('document.querySelectorAll("input[required]").forEach(e=>e.value=e.type==="email"?"view@example.com":e.type==="number"?"12":"Temporary entry");document.querySelectorAll("select[required]").forEach(e=>e.selectedIndex=1);document.querySelector(".wf-profile-form").requestSubmit()');
  await until('!!document.querySelector(".wf-notice")');
  assert.equal(await evaluate('!!document.querySelector(".ant-modal-content")'),false);
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
  await send('Emulation.clearDeviceMetricsOverride');checks.push(route);console.log('PASS',route);
 }
 assert.deepEqual(errors,[]);console.log('PASS: empty data, reset, save without approval modal, mobile overflow, no runtime errors');
}finally{clearInterval(keepAlive);socket?.close();chrome.kill();}
