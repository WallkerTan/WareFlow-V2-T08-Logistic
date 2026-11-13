// Browser/API contract tests. Fixtures stay in tests; production always calls the backend.
// Start Vite first: npm run dev -- --host 127.0.0.1
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:5173';
const profile = await mkdtemp(path.join(tmpdir(), 'wareflow-api-test-'));
const chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9224', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const calls = [], errors = [], unexpected = [];
const page = content => ({ content, number: 0, size: 20, totalPages: content.length ? 1 : 0, totalElements: content.length });
const wh = { id: 'w1', name: 'API warehouse', ownerCompanyId: 'c1', warehouseType: 'RENT', status: 'ACTIVE', area: 100, price: 2000, profile: {}, handover: { managerId: 'u1' } };
const employees = [], products = [], purchaseOrders = [], shipments = [], transfers = [], budgets = [], expenses = [];
const notifications=[{id:1,title:'Thông báo kiểm thử',isRead:false,payload:{message:'Kiểm tra chi tiết thông báo'},createdAt:'2026-11-13T00:00:00Z'}];
const sale = { id: 'sale1', warehouseId: 'w1', type: 'EXPORT_SALE', status: 'DONE', approval: { pickAt: '2026-11-01', packAt: '2026-11-01' }, lines: [], createdAt: '2026-11-01T10:00:00Z' };
let socket, role = 'COMPANY_ADMIN', failProducts = false;
const session = () => ({ accessToken: 'test-token', tokenType: 'Bearer', expiresAt: new Date(Date.now() + 3600000).toISOString(), userId: 'u1', email: 'owner@example.com', fullName: 'API user', role, companyId: 'c1', companyName: 'API company' });
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF1cAAAAASUVORK5CYII=';
const uploadedUrl = `data:image/png;base64,${png}`;
wh.profile.images=[uploadedUrl];
const keepAlive = setInterval(() => {}, 1000);
try {
    let targets;
    for (let i = 0; i < 100; i++) { try { targets = await (await fetch('http://127.0.0.1:9224/json')).json(); break; } catch { await sleep(100); } }
    assert.ok(targets, 'Chrome started');
    socket = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let seq = 0; const pending = new Map();
    function send(method, params = {}) { return new Promise((resolve, reject) => { const id = ++seq; const timer = setTimeout(() => { pending.delete(id); reject(Error(`${method} timeout`)); }, 15000); pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } }); socket.send(JSON.stringify({ id, method, params })); }); }
    async function fulfill(event) {
        const { request: req, requestId } = event; const url = new URL(req.url); const route = url.pathname.replace(/^\/api\//, '');
        calls.push({ url:req.url, route, method: req.method, body: req.postData, headers: req.headers });
        let data, status = 200; const body = req.postData?.startsWith('{') ? JSON.parse(req.postData) : {};
        if (route === 'core/auth/login') { if (body.password === 'wrong') { status = 401; data = { message: 'Sai tài khoản hoặc mật khẩu.' }; } else data = session(); }
        else if (route === 'core/auth/register-company') data = { ...session(), accessToken: null, status: 'PENDING' };
        else {
            assert.equal((req.headers.Authorization || req.headers.authorization), 'Bearer test-token', route + ' bearer');
            if (route === 'core/warehouses/my-company' || route === 'core/warehouses') data = page([wh, {...wh,id:'w2',name:'Other manager warehouse',handover:{managerId:'u2'}}]);
            else if (route === 'core/users/me') data = { ...session(), avatar: null, profile: {} };
            else if (route === 'core/companies/my-company') data = { id: 'c1', name: 'API company', businessModel: 'FOOD', profile: {} };
            else if (route === 'core/companies') data = page([{ id: 'c1', name: 'API company', status: 'ACTIVE', businessModel: 'FOOD' }]);
            else if (route.startsWith('core/reports/')) data = route.includes('rankings') ? [] : { totalWarehouses: 1, totalCompanies: 1 };
            else if (route === 'core/employees') { if (req.method === 'POST') { data = { ...body, id: 'e1', role: 'WAREHOUSE_MANAGER', status: 'ACTIVE' }; employees.push(data); } else data = employees; }
            else if(route==='inventory/warehouses/w1/products/p1'){if(req.method==='PUT'){Object.assign(products[0],body);data=products[0];}else if(req.method==='DELETE'){products.splice(0);data={};}else data=products[0];}
            else if (route === 'core/employees/e1') { Object.assign(employees[0], body); data = employees[0]; }
            else if (route === 'core/upload/image') { assert.match(req.headers['Content-Type'] || req.headers['content-type'], /^multipart\/form-data; boundary=/); data = { secureUrl: uploadedUrl, publicId: 'test/product' }; }
            else if (route === 'inventory/warehouses/w1/products') {
                if (failProducts) { status = 503; data = { message: 'Inventory unavailable test' }; }
                else if (req.method === 'POST') { data = { ...body, id: 'p1', quantity: 0, available: 0 }; products.push(data); }
                else data = page(products);
            }
            else if (route === 'inventory/warehouses/w1/purchase-orders') {
                if (req.method === 'POST') { data = { ...body, warehouseId:'w1', id: 'po1', type: 'PO', status: 'DRAFT', approval: { note: body.note } }; purchaseOrders.push(data); }
                else data = page(purchaseOrders);
            }
            else if(route==='inventory/warehouses/w1/purchase-orders/po1/receipts')data=[];
            else if (route === 'inventory/warehouses/w1/purchase-orders/po1/submit') { purchaseOrders[0].status = 'PENDING_APPROVAL'; data = purchaseOrders[0]; }
            else if (route === 'inventory/warehouses/w1/purchase-orders/po1/approve') { assert.equal(role, 'COMPANY_ADMIN'); purchaseOrders[0].status = 'APPROVED'; data = purchaseOrders[0]; }
            else if(route==='inventory/warehouses/w1/sales-returns'){assert.equal(body.shipmentId,'returned1');assert.equal(body.condition,'DAMAGED');data={id:'return-receipt',type:'RECEIPT',status:'DONE',lines:[]};}
            else if (route === 'inventory/warehouses/w1/exports') {
                if(req.method==='POST'){assert.equal(body.type,'EXPORT_TRANSFER');assert.equal(body.targetWarehouseId,'w2');assert.equal(body.lines[0].targetProductId,'p2');data={...body,id:'tr1',status:'DRAFT',approval:{}};transfers.push(data);}
                else data=page(url.searchParams.get('type')==='EXPORT_TRANSFER'?transfers:[sale]);
            }
            else if(route==='inventory/warehouses/w1/transfer-products'){assert.equal(url.searchParams.get('targetWarehouseId'),'w2');data=[{id:'p2',sku:'SKU-API',name:'Target product',unit:'box'}];}
            else if(route==='inventory/warehouses/w1/reports/summary') data={products:products.length,lots:1,pendingDocuments:0,alerts:{LOW_STOCK:0,NEAR_EXPIRY:0,EXPIRED:0},documentsByStatus:{DRAFT:0,DONE:0}};
            else if (route === 'inventory/warehouses/w1/products/p1/lots') data = [{id:'lot1',productId:'p1',lotCode:'LOT-1',quantity:10,reserved:0,available:10,status:'OK'}];
            else if (route === 'inventory/warehouses/w1/alerts') data = [];
            else if (route.startsWith('inventory/warehouses/w1/')) data = page([]);
            else if (route === 'finance/reports/finance') data = { income: 0, expense: 0, net: 0 };
            else if (route === 'finance/reports/finance/timeseries') data = { points: [] };
            else if (route === 'finance/reports/finance/categories') data = { items: [] };
            else if (route === 'finance/budgets'){if(req.method==='POST'){data={...body,id:'b1',spent:0,remaining:body.allocated,overBudget:0};budgets.push(data);}else data=budgets;}
            else if(route==='finance/expense-requests'){if(req.method==='POST'){data={...body,id:'ex1',status:'PENDING',createdAt:'2026-11-13T00:00:00Z'};expenses.push(data);}else data=page(expenses);}
            else if(route==='finance/reports/finance/companies')data=[{company_id:'c1',transaction_count:2,revenue:200000,expense:10000,system_fee:1000}];
            else if (route.startsWith('finance/')) data = page([]);
            else if (route === 'delivery/warehouses/w1/shipments') {
                if (req.method === 'POST') { assert.equal(body.documentId, sale.id); data = { ...body, id: 's1', status: 'CREATED', codStatus: 'PENDING', history: [] }; shipments.push(data); }
                else data = page(shipments);
            }
            else if (route === 'delivery/warehouses/w1/shipments/s1/status') { Object.assign(shipments[0], body); data = shipments[0]; }
            else if (route === 'delivery/warehouses/w1/shipments/s1/cod/collect') { assert.equal(shipments[0].status, 'DELIVERED'); shipments[0].codStatus = 'COLLECTED'; data = shipments[0]; }
            else if (route === 'core/approvals') data = { warehouseTransactions: page([]), negotiatingWarehouseTransactions: page([]), expenses: page([]), inventory: [] };
            else if (route === 'core/notifications') data = notifications;
            else if(route==='core/notifications/unread-count')data=notifications.filter(n=>!n.isRead).length;
            else if(route==='core/notifications/1/read'||route==='core/notifications/read-all'){notifications.forEach(n=>n.isRead=true);data={};}
            else if(route.endsWith('/statistics')&&route.startsWith('core/system-logs'))data=[{date:'2026-11-13',totalLogs:3}];
            else if(route.startsWith('core/system-logs'))data=page([{id:9,action:'UPDATE_PROFILE',actorName:'API user',actorEmail:'owner@example.com',companyName:'API company',createdAt:'2026-11-13T00:00:00Z',target:{targetType:'User'},metadata:{status:'FAILED',description:'Cập nhật hồ sơ',clientIp:'127.0.0.1',errorMessage:'Chi tiết lỗi kiểm thử'}}]);
            else if (route === 'core/suppliers' || route === 'core/customers' || route === 'core/warehouse-transactions' || route.startsWith('core/system-logs')) data = page([]);
            else { unexpected.push(route); status = 500; data = { message: `Unhandled test route ${route}` }; }
        }
        await send('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(data)).toString('base64') });
    }
    socket.onmessage = ({ data }) => { const event = JSON.parse(data); if (event.id) { const result = pending.get(event.id); pending.delete(event.id); if (event.error) result?.reject(Error(event.error.message)); else result?.resolve(event.result); } else if (event.method === 'Runtime.exceptionThrown') errors.push(event.params.exceptionDetails.exception?.description || event.params.exceptionDetails.text); else if (event.method === 'Fetch.requestPaused') fulfill(event.params).catch(error => { if (!error.message.includes('Invalid InterceptionId')) { errors.push(error.stack); console.error(error); } }); else if (event.method === 'Page.javascriptDialogOpening') void send('Page.handleJavaScriptDialog', { accept: true }); };
    async function evaluate(expression) { const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (response.exceptionDetails) throw Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text); return response.result.value; }
    async function until(expression) { for (let i = 0; i < 120; i++) { if (await evaluate(expression)) return; await sleep(70); } throw Error(`Timed out: ${expression}\n${await evaluate('document.body.innerText')}`); }
    async function navigate(route) { await send('Page.navigate', { url: origin + route }); await until('document.readyState === "complete" && !!document.querySelector("#root")?.children.length'); }
    async function input(selector, value) { await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)throw Error('Missing input');Object.getOwnPropertyDescriptor(el instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`); }
    async function click(label, scope = 'document') { await evaluate(`(()=>{const el=[...${scope}.querySelectorAll('button'),...${scope}.querySelectorAll('a')].find(b=>b.textContent.trim()===${JSON.stringify(label)});if(!el)throw Error('Missing button '+${JSON.stringify(label)}+' BODY '+document.body.innerText);el.click()})()`); }
    async function assume(nextRole) { role = nextRole; await evaluate(`sessionStorage.setItem('wareflow.auth',${JSON.stringify(JSON.stringify(session()))});localStorage.removeItem('wareflow.auth')`); }
    await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Fetch.enable', { patterns: [{ urlPattern: '*/api/*' }] });
    await navigate('/company/employees'); await until('location.pathname === "/auth/login" && !!document.querySelector("#email")'); assert.equal(calls.length, 0); console.log('PASS unauthenticated guard');
    await input('#email', 'owner@example.com'); await input('#password', 'wrong'); await click('Đăng nhập'); await until('document.body.innerText.includes("Sai tài khoản")'); assert.equal(await evaluate('sessionStorage.getItem("wareflow.auth")'), null);
    await input('#password', 'valid-password'); await click('Đăng nhập'); await until('location.pathname === "/company/dashboard" && document.body.innerText.includes("API company")'); console.log('PASS login: errors, bearer session, role redirect');
    await navigate('/company/employees/new'); await until('!!document.querySelector(".adm-modal")');
    await input('input[name="fullName"]', 'New manager'); await input('input[name="email"]', 'manager@example.com'); await input('input[name="password"]', 'long-password'); await click('Lưu', 'document.querySelector(".adm-modal")'); await until('!document.querySelector(".adm-modal") && document.body.innerText.includes("New manager")'); assert.equal(employees.length, 1);
    await click('Cập nhật'); await until('!!document.querySelector(".adm-modal")'); await input('.adm-modal select', 'LOCKED'); await click('Lưu', 'document.querySelector(".adm-modal")'); await until('!document.querySelector(".adm-modal") && document.body.innerText.includes("Đã khóa")'); assert.equal(employees[0].status, 'LOCKED'); console.log('PASS employee POST/PATCH and server refresh');
    await assume('WAREHOUSE_MANAGER'); await navigate('/storehouse/inventory'); await until('document.body.innerText.includes("Danh mục hàng hóa") && [...document.querySelectorAll("button")].some(b=>b.textContent.trim()==="Thêm mới")'); await click('Thêm mới'); await until('!!document.querySelector(".adm-modal")');
    await input('input[name="sku"]', 'SKU-API'); await input('input[name="name"]', 'Uploaded product'); await input('input[name="unit"]', 'box');
    const file = path.join(profile, 'pixel.png'); await writeFile(file, Buffer.from(png, 'base64')); const dom = await send('DOM.getDocument'); const node = await send('DOM.querySelector', { nodeId: dom.root.nodeId, selector: 'input[type=file]' }); await send('DOM.setFileInputFiles', { nodeId: node.nodeId, files: [file] }); await until('!!document.querySelector(".live-gallery img")');
    await click('Lưu', 'document.querySelector(".adm-modal")'); await until('!document.querySelector(".adm-modal") && document.body.innerText.includes("Uploaded product")'); assert.deepEqual(products[0].images, [uploadedUrl]); assert.equal(products[0].sku, 'SKU-API'); console.log('PASS multipart image upload and product API payload');
    await navigate('/storehouse/transfers'); await until('document.body.innerText.includes("Điều chuyển giữa các kho")'); await click('Tạo điều chuyển'); await until('!!document.querySelector(".adm-modal select[name=targetWarehouseId] option[value=w2]")'); await input('.adm-modal select[name=targetWarehouseId]','w2');
    await until('!!document.querySelector(".adm-modal .live-line select option[value=p1]")'); await input('.adm-modal .live-line select','p1'); await until('!!document.querySelector('+JSON.stringify('select[aria-label="Lô hàng"] option[value=lot1]')+')'); await input('select[aria-label="Lô hàng"]','lot1'); await until('!!document.querySelector(".adm-modal .live-line select option[value=p2]")');
    await evaluate('(()=>{const el=[...document.querySelectorAll(".adm-modal .live-line select")].find(s=>[...s.options].some(o=>o.value==="p2"));Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value").set.call(el,"p2");el.dispatchEvent(new Event("change",{bubbles:true}));})()'); await input('.adm-modal .live-line input[type=number]','2'); await click('Lưu phiếu','document.querySelector(".adm-modal")'); await until('!document.querySelector(".adm-modal") && document.body.innerText.includes("tr1")'); assert.equal(transfers.length,1); console.log('PASS manager transfer to another assigned manager in same company');
    await navigate('/storehouse/lots');await until('document.body.innerText.includes("LOT-1")');await click('Truy vết lô');await until('location.pathname==="/storehouse/history"');await sleep(200);assert.ok(calls.some(c=>c.route==='inventory/warehouses/w1/movements'&&new URL(c.url).searchParams.get('lotId')==='lot1'));console.log('PASS lot-to-movement trace link');
    const before = calls.length; await navigate('/admin/companies'); await until('location.pathname === "/storehouse/inventory"'); assert.equal(calls.slice(before).some(c => c.route === 'core/companies'), false); console.log('PASS role isolation');
    await navigate('/storehouse/inbound/new'); await until('!!document.querySelector(".adm-modal .live-line select option[value=p1]")');
    await input('.adm-modal .live-line select', 'p1'); await input('.adm-modal .live-line input[type=number]', '3'); await click('Lưu phiếu', 'document.querySelector(".adm-modal")'); await until('!document.querySelector(".adm-modal") && document.body.innerText.includes("po1")');
    assert.equal(purchaseOrders[0].lines[0].qty, 3); assert.equal(purchaseOrders[0].lines[0].productId, 'p1');
    await click('Gửi duyệt'); await until('document.body.innerText.includes("Chờ phê duyệt")'); assert.equal(await evaluate('[...document.querySelectorAll("button")].some(b=>b.textContent.trim()==="Duyệt")'), false);
    await assume('COMPANY_ADMIN'); await navigate('/company/inbound'); await until('[...document.querySelectorAll("button")].some(b=>b.textContent.trim()==="Duyệt")'); await click('Duyệt'); await until('!!document.querySelector(".adm-modal")'); await click('Lưu', 'document.querySelector(".adm-modal")'); await until('!document.querySelector(".adm-modal") && document.body.innerText.includes("Nhận hàng")'); assert.equal(purchaseOrders[0].status, 'APPROVED'); await click('Chi tiết');await until('document.body.innerText.includes("Lịch sử nhận hàng")');await evaluate('document.querySelector(".adm-modal-close").click()');console.log('PASS purchase-order create, submit, company approval and receipt history');
    await assume('WAREHOUSE_MANAGER'); await navigate('/storehouse/shipments/new'); await until('!!document.querySelector(".adm-modal select option[value=sale1]")');
    await input('.adm-modal select', 'sale1'); await input('input[name=carrier]', 'API carrier'); await input('input[name=trackingCode]', 'TRACK-API'); await input('input[name=codAmount]', '150000'); await click('Lưu', 'document.querySelector(".adm-modal")'); await until('!document.querySelector(".adm-modal") && document.body.innerText.includes("TRACK-API")');
    for (const next of ['IN_TRANSIT', 'DELIVERED']) { await click('Cập nhật giao hàng'); await until('!!document.querySelector(".adm-modal")'); await input('.adm-modal select', next); await click('Lưu', 'document.querySelector(".adm-modal")'); await until('!document.querySelector(".adm-modal")'); }
    await until('[...document.querySelectorAll("button")].some(b=>b.textContent.trim()==="Xác nhận thu COD")'); await click('Xác nhận thu COD'); await until('!!document.querySelector(".adm-modal")'); await click('Đã nhận đủ tiền','document.querySelector(".adm-modal")'); await until('document.body.innerText.includes("Đã thu")'); assert.equal(shipments[0].codStatus, 'COLLECTED'); console.log('PASS shipment create, delivery transitions and COD');
    shipments.splice(0,shipments.length,{id:'returned1',documentId:'sale-returned',warehouseId:'w1',carrier:'API carrier',trackingCode:'RETURN-API',status:'RETURNED',codAmount:0,codStatus:'NOT_REQUIRED',history:[]});
    await navigate('/storehouse/shipments'); await until('document.body.innerText.includes("RETURN-API")'); await click('Nhập hàng hoàn'); await until('!!document.querySelector(".adm-modal")'); await click('Lưu','document.querySelector(".adm-modal")'); await until('document.body.innerText.includes("Phiếu nhập hàng hoàn")'); await evaluate('document.querySelector(".adm-modal-close").click()'); await until('!document.querySelector(".adm-modal")'); assert.ok(calls.some(c=>c.route==='inventory/warehouses/w1/sales-returns'&&c.method==='POST'));console.log('PASS returned shipment restock defaults to quarantined goods');
    failProducts = true; await navigate('/storehouse/inventory'); await until('document.body.innerText.includes("Inventory unavailable test")'); assert.equal(await evaluate('document.body.innerText.includes("Uploaded product")'), false); failProducts = false; console.log('PASS server errors never fall back to demo data');
    const managerRoutes = ['dashboard','transfers','inventory','lots','alerts','inbound','receipts','outbound','stocktakes','adjustments','shipments','history','finance','budget','suppliers','products','customers','profile','notifications'];
    const companyRoutes = ['dashboard','warehouses','marketplace','warehouse-transactions','inventory','lots','alerts','suppliers','products','customers','employees','finance','transfers','inbound','receipts','outbound','stocktakes','adjustments','history','shipments','approvals','profile','notifications','logs'];
    const adminRoutes = ['dashboard','companies','warehouses','suppliers','products','warehouse-transactions','finance','inventory','lots','alerts','inbound','receipts','outbound','stocktakes','adjustments','history','shipments','logs','notifications','profile'];
    for (const [nextRole, base, routes] of [['WAREHOUSE_MANAGER','storehouse',managerRoutes],['COMPANY_ADMIN','company',companyRoutes],['SYSTEM_ADMIN','admin',adminRoutes]]) {
        await assume(nextRole);
        for (const route of routes) { console.log('CHECK', base + '/' + route); await navigate(`/${base}/${route}`); await until('!!document.querySelector(".wf-content h1") || !!document.querySelector(".wf-content .live-empty")'); await sleep(180); assert.equal(await evaluate('document.body.innerText.includes("Unexpected Application Error")'), false, base + '/' + route); }
        console.log(`PASS ${base}: ${routes.length} real API screens`);
    }
    await assume('COMPANY_ADMIN'); await navigate('/company/warehouses'); await until('document.body.innerText.includes("API warehouse")'); await click('Xem chi tiết'); await until('!!document.querySelector(".live-photo-main")'); assert.equal(await evaluate('document.querySelector(".live-photo-main").getAttribute("src")'),uploadedUrl); await evaluate('document.querySelector(".adm-modal-close").click()');console.log('PASS warehouse gallery and full detail panel');
    await navigate('/company/finance'); await until('!!document.querySelector('+JSON.stringify('form[aria-label="Chọn kỳ báo cáo"]')+')');
    await input('form[aria-label="Chọn kỳ báo cáo"] select','quarter'); await input('form[aria-label="Chọn kỳ báo cáo"] input[type=number]','2026');
    await evaluate("(()=>{const el=document.querySelectorAll('form[aria-label=\"Chọn kỳ báo cáo\"] select')[1];Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,\"value\").set.call(el,\"2\");el.dispatchEvent(new Event(\"change\",{bubbles:true}));})()");await click('Xem kỳ');await sleep(250);assert.ok(calls.some(c=>c.route==='finance/reports/finance'&&new URL(c.url).searchParams.get('period')==='Q2-2026'));
    await click('Ngân sách');await until('document.body.innerText.includes("Ngân sách đã cấp")');await click('Cấp ngân sách');await until('!!document.querySelector(".adm-modal")');await input('input[name=allocated]','500000');await click('Lưu','document.querySelector(".adm-modal")');await until('!document.querySelector(".adm-modal")');assert.equal(budgets[0].period,'Q2-2026');
    await click('Đề nghị chi');await until('document.body.innerText.includes("Tạo đề nghị chi")');await click('Tạo đề nghị chi');await until('!!document.querySelector(".adm-modal")');await input('select[name=warehouseId]','w1');await input('select[name=category]','PURCHASE');await input('input[name=amount]','15000');await evaluate('(()=>{const el=document.querySelector("textarea[name=note]");Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value").set.call(el,"Vật tư đóng gói");el.dispatchEvent(new Event("input",{bubbles:true}));})()');await click('Lưu','document.querySelector(".adm-modal")');await until('!document.querySelector(".adm-modal")&&document.body.innerText.includes("Vật tư đóng gói")');assert.equal(expenses[0].amount,15000);console.log('PASS quarter picker, budget and expense forms');
    await navigate('/company/notifications');await until('document.body.innerText.includes("Thông báo kiểm thử")');await click('Thông báo kiểm thử');await until('document.body.innerText.includes("Kiểm tra chi tiết thông báo")');await click('Đánh dấu đã đọc','document.querySelector(".adm-modal")');await until('document.querySelector(".adm-modal").innerText.includes("Đã đọc")');assert.equal(notifications[0].isRead,true);await evaluate('document.querySelector(".adm-modal-close").click()');console.log('PASS notification content and read state');
    await navigate('/company/logs');await until('document.body.innerText.includes("UPDATE_PROFILE")');await click('Xem chi tiết');await until('document.body.innerText.includes("Chi tiết lỗi kiểm thử")');assert.ok(await evaluate('document.querySelector(".adm-modal").innerText.includes("Thất bại")'));await evaluate('document.querySelector(".adm-modal-close").click()');await click('Thống kê theo ngày');await until('document.body.innerText.includes("2026-11-13")');console.log('PASS log details and daily statistics');
    await assume('WAREHOUSE_MANAGER');await navigate('/storehouse/inventory');await until('document.body.innerText.includes("Uploaded product")');await click('Sửa');await until('!!document.querySelector(".adm-modal")');await input('input[name=name]','Unsaved change');await click('Hủy','document.querySelector(".adm-modal")');await until('document.body.innerText.includes("Biểu mẫu có thay đổi chưa lưu")');assert.equal(products[0].name,'Uploaded product');await click('Bỏ thay đổi');await until('!document.querySelector(".adm-modal")');await click('Xóa');await until('document.body.innerText.includes("Xác nhận xóa / vô hiệu hóa")');assert.equal(products.length,1);await click('Quay lại');await until('!document.querySelector(".adm-modal")');assert.equal(products.length,1);console.log('PASS unsaved form protection and delete cancellation');
    const captureDir=process.env.TEST_ARTIFACT_DIR||profile;await mkdir(captureDir,{recursive:true});
    async function capture(name){await sleep(350);const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(path.join(captureDir,name+'.png'),Buffer.from(shot.data,'base64'));}
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await assume('SYSTEM_ADMIN');await navigate('/admin/finance');await until('document.body.innerText.includes("So sánh công ty")');await click('So sánh công ty');await until('document.body.innerText.includes("Thu chi các công ty")&&!!document.querySelector(".live-table")');await capture('finance-desktop');
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); await navigate('/admin/inventory'); await sleep(300); assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'mobile overflow'); await capture('inventory-mobile');await navigate('/admin/finance');await until('!!document.querySelector("form input[type=month]")');assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'finance mobile overflow');await capture('finance-mobile');await click('Ngân sách');await until('document.body.innerText.includes("Cấp ngân sách")');await click('Cấp ngân sách');await until('!!document.querySelector(".adm-modal")');assert.equal(await evaluate('document.querySelector(".adm-modal").getBoundingClientRect().right<=innerWidth'),true);await capture('budget-form-mobile');await click('Hủy','document.querySelector(".adm-modal")');
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".wf-signin")).display!=="none"'),true,'mobile logout accessible');await click('Đăng xuất'); await until('location.pathname === "/auth/login"'); assert.equal(await evaluate('sessionStorage.getItem("wareflow.auth") || localStorage.getItem("wareflow.auth")'), null);
    await navigate('/auth/register'); await until('!!document.querySelector("#companyName")');
    for (const [id, value] of Object.entries({ companyName: 'Pending company', fullName: 'Pending owner', phone: '0901234567', email: 'pending@example.com', password: 'Valid-pass123', confirmPassword: 'Valid-pass123' })) await input(`#${id}`, value);
    await evaluate('document.querySelector("input[name=accepted]").click()'); await click('Tạo tài khoản công ty'); await until('document.body.innerText.includes("Vui lòng chờ quản trị hệ thống phê duyệt")'); assert.equal(await evaluate('sessionStorage.getItem("wareflow.auth") || localStorage.getItem("wareflow.auth")'), null); console.log('PASS logout and pending registration never creates session');
    assert.deepEqual(unexpected, []); assert.deepEqual(errors, []); assert.ok(calls.some(c => c.route.startsWith('finance/'))); assert.ok(calls.some(c => c.route.startsWith('delivery/')));
    console.log(`PASS mobile layout, no runtime errors; ${calls.length} API requests checked`);
} catch (error) { console.error('Runtime errors:', errors); throw error; } finally { clearInterval(keepAlive); socket?.close(); chrome.kill(); }
