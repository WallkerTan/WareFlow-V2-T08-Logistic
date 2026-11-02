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
 async function until(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await sleep(70);}throw Error(expression+" BODY: "+await evaluate("document.body.innerText")+" ERRORS: "+JSON.stringify(errors));}
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
 for(const [route,role,prefix,count] of [['/wareflow/warehouses','admin','/wareflow/',2],['/wareflow/profile','admin','/wareflow/',2],['/company/warehouses','company','/company/',2],['/company/profile','company','/company/',2],['/storehouse/profile','storehouse','/storehouse/',1]]){
  await send('Page.navigate',{url:origin+route});
  await until('!!document.querySelector(".wf-role-'+role+'")');
  assert.equal(await evaluate('document.querySelectorAll(".wf-sidebar nav a").length'),count);
  assert.equal(await evaluate('Array.from(document.querySelectorAll(".wf-sidebar nav a")).every(a=>a.getAttribute("href").startsWith('+JSON.stringify(prefix)+'))'),true);
  assert.equal(await evaluate('document.querySelectorAll(".wf-sidebar nav a.active").length'),1);
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".wf-topbar")).display!=="none"'),true);
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".wf-sidebar")).display'), 'none');
  await evaluate('document.querySelector(".wf-menu-button").click()');
  await until('document.querySelector(".wf-menu-button").getAttribute("aria-expanded")==="true"');
  assert.notEqual(await evaluate('getComputedStyle(document.querySelector(".wf-sidebar")).display'), 'none');
  await evaluate('document.querySelector(".wf-sidebar nav a").click()');
  await until('document.querySelector(".wf-menu-button").getAttribute("aria-expanded")==="false"');
  await send('Emulation.clearDeviceMetricsOverride');
  console.log('PASS',route,'role navigation, topbar, mobile menu and overflow');
 }
 await send('Page.navigate',{url:origin+'/company/warehouses?company='+encodeURIComponent('TechViet')});
 await until('!!document.querySelector(".wf-role-company")');
 await evaluate('document.querySelectorAll(".wf-sidebar nav a")[1].click()');
 await until('location.pathname==="/company/profile"');
 assert.equal(await evaluate('new URLSearchParams(location.search).get("company")'),'TechViet');
 await evaluate('document.querySelector(".wf-notice a").click()');
 await until('location.pathname==="/company/warehouses"');
 assert.equal(await evaluate('new URLSearchParams(location.search).get("company")'),'TechViet');
 console.log('PASS company context retained between profile and warehouses');
 for(const [route,result] of [['/wareflow','/wareflow/warehouses'],['/company','/company/warehouses'],['/storehouse','/storehouse/profile']]){await send('Page.navigate',{url:origin+route});await until('location.pathname==='+JSON.stringify(result));}
 assert.deepEqual(errors,[]);console.log('PASS default role routes and no runtime errors');
}finally{clearInterval(keepAlive);socket?.close();chrome.kill();}

