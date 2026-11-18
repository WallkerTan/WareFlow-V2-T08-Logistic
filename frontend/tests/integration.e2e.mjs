// Real browser, deterministic API fixtures. No production writes or extra packages.
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:5173';
const chromePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = await mkdtemp(path.join(tmpdir(), 'wareflow-integration-'));
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9225', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const now = new Date();
const past = days => new Date(now.getTime() - days * 86400000).toISOString();
const currentMonth = new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 7);
const companies = [{ id: 'c1', name: 'Công ty A', businessModel: 'TECH', status: 'ACTIVE', profile: { taxCode: '0123456789', phone: '0901234567', address: 'Hà Nội' }, createdAt: past(200) }, { id: 'c2', name: 'Công ty B', businessModel: 'FOOD', status: 'PENDING', profile: {}, createdAt: past(10) }];
const warehouses = [1, 2].map(i => ({ id: 'w' + i, ownerCompanyId: 'c1', ownerCompanyName: 'Công ty A', name: 'Kho ' + i, region: 'Miền Bắc', address: 'Hà Nội', area: 1200, price: 25000000, warehouseType: 'RENT', status: 'ACTIVE', handover: { managerId: 'manager', managerName: 'Quản lý', handedOverAt: past(100) }, profile: { images: [] }, createdAt: past(120) }));
const suppliers = [{ id: 's1', name: 'Nhà cung cấp A', businessModel: 'TECH', kind: 'SYSTEM', email: 'supplier@example.com', phone: '0901234567', address: 'Hà Nội' }];
const products = [{ id: 'p1', warehouseId: 'w1', sku: 'SKU1', name: 'Sản phẩm A', unit: 'cái', quantity: 12, available: 9, minStock: 10, images: [], createdAt: past(10) }];
const transactions = [
    { id: 't1', companyId: 'c1', warehouseId: 'w1', type: 'INCOME', category: 'SALE', amount: 100000000, note: 'Thu bán hàng', createdAt: past(0) },
    { id: 't2', companyId: 'c1', warehouseId: 'w1', type: 'EXPENSE', category: 'OTHER', amount: 20000000, note: 'Chi vận hành', createdAt: past(0) },
    { id: 't3', companyId: 'c1', warehouseId: 'w1', type: 'SYSTEM_FEE', category: 'OTHER', amount: 5000000, note: 'Phí hệ thống', createdAt: past(0) },
    { id: 't4', companyId: 'c1', warehouseId: 'w1', type: 'INCOME', category: 'SALE', amount: 50000000, note: 'Thu kỳ trước', createdAt: past(100) },
];
const notifications = [{ id: 'n1', type: 'GENERAL', scope: 'SYSTEM', title: 'Thông báo kiểm tra', payload: { message: 'Nội dung' }, isRead: false, createdAt: past(0) }];
const employee = { id: 'manager', companyId: 'c1', fullName: 'Quản lý', email: 'manager@example.com', role: 'WAREHOUSE_MANAGER', status: 'ACTIVE', profile: {} };
const doc = { id: 'po1', warehouseId: 'w1', type: 'PO', status: 'PENDING_APPROVAL', lines: [{ productId: 'p1', qty: 5, price: 12000, receivedQty: 0 }], approval: { supplierName: suppliers[0].name }, createdAt: past(1) };
let role = 'SYSTEM_ADMIN';
let failNotifications = false;
let failSupplier = false;
let socket, send, evaluate;
const writes = [];
const loginRequests = [];
const reads = [];
const failures = [];
const runtimeErrors = [];
const networkErrors = [];
const keepAlive = setInterval(() => {}, 1000);
const authSession = () => ({ userId: role === 'WAREHOUSE_MANAGER' ? 'manager' : role === 'COMPANY_ADMIN' ? 'company' : 'admin', role, accessToken: 'browser-test', expiresAt: '2999-01-01T00:00:00Z', fullName: 'Người kiểm tra', email: 'test@example.com', companyId: role === 'SYSTEM_ADMIN' ? null : 'c1', companyName: role === 'SYSTEM_ADMIN' ? null : 'Công ty A' });
function fixture(url, method, body) {
    const p = url.pathname;
    const page = Number(url.searchParams.get('page') || 0);
    if (p === '/api/core/auth/login' && method === 'POST') {
        loginRequests.push(body);
        assert.deepEqual(Object.keys(body).sort(), ['email', 'password', 'remember']);
        assert.equal(body.email, 'test@example.com');
        if (body.password !== 'correct-password') return [401, { message: 'Invalid credentials' }];
        return [200, authSession()];
    }
    if (method !== 'GET') {
        writes.push({ p, method, body });
        if (p === '/api/core/suppliers' && failSupplier) return [409, { message: 'Nhà cung cấp đã tồn tại' }];
        if (p === '/api/core/suppliers') suppliers.push({ ...body, id: 's-new' });
        if (/\/products$/.test(p) && method === 'POST') products.push({ ...body, id: 'p-new', warehouseId: p.split('/')[4], quantity: 0, available: 0 });
        if (p.endsWith('/n1/read')) notifications[0].isRead = true;
        return [200, { ...body, id: 'created' }];
    }
    reads.push(p + url.search);
    const list = items => [200, { content: items, totalPages: 1, totalElements: items.length, number: 0, size: 100 }];
    if (p === '/api/core/companies') return [200, { content: [companies[page]], totalPages: 2, totalElements: 2, number: page, size: 1 }];
    if (p === '/api/core/companies/my-company') return [200, companies[0]];
    if (p === '/api/core/warehouses' || p === '/api/core/warehouses/my-company') return list(url.searchParams.get('status') ? [] : warehouses);
    if (p === '/api/core/users/me') return [200, { id: authSession().userId, fullName: 'Người kiểm tra', email: 'test@example.com', role, status: 'ACTIVE', profile: {}, companyId: authSession().companyId }];
    if (p === '/api/core/employees') return [200, [employee]];
    if (p === '/api/core/suppliers') return list(suppliers);
    if (/\/suppliers\/[^/]+\/products$/.test(p)) return [200, [{ id: 'sp-' + p.split('/')[4], sku: 'SP1', name: 'Sản phẩm cung ứng', unit: 'cái', price: 20000 }]];
    if (p === '/api/core/notifications') return failNotifications ? [503, { message: 'Tạm mất kết nối thông báo' }] : [200, notifications];
    if (p.startsWith('/api/core/system-logs')) return list([{ id: 'log1', action: 'UPDATE', actorName: 'Người kiểm tra', companyName: 'Công ty A', target: { targetType: 'WAREHOUSE' }, metadata: { description: 'Cập nhật kho' }, createdAt: past(0) }]);
    if (p === '/api/core/warehouse-transactions') return list([]);
    if (p === '/api/finance/transactions') return list(transactions.filter(t => (!url.searchParams.get('companyId') || t.companyId === url.searchParams.get('companyId')) && t.createdAt.startsWith(url.searchParams.get('period')) && (!url.searchParams.get('warehouseId') || t.warehouseId === url.searchParams.get('warehouseId'))));
    if (p === '/api/finance/budgets') return [200, url.searchParams.get('companyId') === 'c2' ? [] : [{ id: 'b1', period: currentMonth, warehouseId: 'w1', allocated: 0, spent: 1000000 }]];
    if (p === '/api/finance/expense-requests') return list([{ id: 'e1', warehouseId: 'w1', companyId: 'c1', category: 'OTHER', amount: 300000, note: 'Mua vật tư', status: 'PENDING', createdAt: past(0) }]);
    const inventory = p.match(/^\/api\/inventory\/warehouses\/([^/]+)\/(.+)$/);
    if (inventory) {
        const [, wh, collection] = inventory;
        if (collection === 'products') return list(products.filter(p => p.warehouseId === wh));
        if (collection.endsWith('/lots')) return [200, [{ id: 'lot1', productId: 'p1', lotCode: 'LOT1', quantity: 12, reserved: 3, available: 9, expiryDate: null, status: 'OK' }]];
        if (collection === 'purchase-orders') return list(wh === 'w1' ? [doc] : []);
        if (collection === 'movements') return list([{ id: 'mv1', sku: 'SKU1', lotCode: 'LOT1', documentType: 'RECEIPT', qtyChange: 12, note: 'Nhập hàng', createdAt: past(1) }]);
        return list([]);
    }
    if (/^\/api\/delivery\/warehouses\/[^/]+\/shipments$/.test(p)) return list(p.includes('/w2/') ? [] : [{ id: 'sh1', trackingCode: 'TRACK1', carrier: 'Đối tác vận chuyển', warehouseId: 'w1', status: 'IN_TRANSIT', codAmount: 100000, codStatus: 'PENDING', createdAt: past(0) }]);
    failures.push('Unexpected API: ' + p);
    return [404, { message: 'Missing test fixture: ' + p }];
}
try {
    let targets;
    for (let i = 0; i < 100; i++) { try { targets = await (await fetch('http://127.0.0.1:9225/json')).json(); break; } catch { await sleep(100); } }
    assert.ok(targets, 'Chrome started');
    socket = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let seq = 0;
    const pending = new Map();
    send = (method, params = {}) => new Promise((resolve, reject) => {
        const id = ++seq; const timer = setTimeout(() => { pending.delete(id); reject(Error(method + ' timeout')); }, 20000);
        pending.set(id, { resolve: r => { clearTimeout(timer); resolve(r); }, reject: e => { clearTimeout(timer); reject(e); } });
        socket.send(JSON.stringify({ id, method, params }));
    });
    socket.onmessage = async ({ data }) => {
        const message = JSON.parse(data);
        if (message.id) { const p = pending.get(message.id); pending.delete(message.id); if (message.error) p?.reject(Error(message.error.message)); else p?.resolve(message.result); }
        if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
        if (message.method === 'Network.loadingFailed') networkErrors.push({ type: message.params.type, error: message.params.errorText, blocked: message.params.blockedReason });
        if (message.method === 'Fetch.requestPaused') {
            const { request, requestId } = message.params;
            try {
                const headers = Object.fromEntries(Object.entries(request.headers).map(([k, v]) => [k.toLowerCase(), v]));
                const isLogin = new URL(request.url).pathname === '/api/core/auth/login';
                if (!isLogin && headers.authorization !== 'Bearer browser-test') failures.push('Missing authorization: ' + request.url);
                const [status, result] = fixture(new URL(request.url), request.method, request.postData ? JSON.parse(request.postData) : undefined);
                if (isLogin) await sleep(350);
                await send('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(result)).toString('base64') });
            } catch (e) { failures.push(String(e)); }
        }
    };
    evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
    async function until(expression, label = expression) { for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await sleep(100); } throw Error('Timed out: ' + label + '\n' + await evaluate('document.body.innerText.slice(0,2500)')); }
    async function go(route, ready = '!!document.querySelector(".wf-content")') { await send('Page.navigate', { url: origin + route }); await until(ready); await until('![...document.querySelectorAll(".wf-notice")].some(e=>e.textContent.includes("Đang tải"))'); await sleep(150); }
    async function pressEnter() {
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: '\r' });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    }
    async function login(as, keyboard = false) {
        role = as;
        await go('/auth/login', '!!document.querySelector(".auth-submit")');
        assert.equal(await evaluate('!!document.querySelector("form select") || document.body.innerText.includes("Vai trò đăng nhập")'), false, 'no role selector');
        assert.equal(await evaluate('getComputedStyle(document.querySelector(".auth-submit")).color'), 'rgb(255, 255, 255)', 'white login label');
        await setField('Email công việc', 'TEST@example.com');
        await setField('Mật khẩu', 'correct-password');
        const before = loginRequests.length;
        if (keyboard) { await evaluate('document.querySelector("#password").focus()'); await pressEnter(); }
        else await evaluate('document.querySelector(".auth-submit").click()');
        await until('document.querySelector(".auth-submit")?.disabled', 'pending login disables submit');
        if (keyboard) await pressEnter();
        const destination = as === 'SYSTEM_ADMIN' ? '/admin/dashboard' : as === 'COMPANY_ADMIN' ? '/company/dashboard' : '/storehouse/inventory';
        await until(`location.pathname === ${JSON.stringify(destination)} && !!document.querySelector('.wf-content')`, 'server role determines home');
        assert.equal(loginRequests.length, before + 1, 'one API request per login');
        assert.equal(await evaluate('JSON.parse(sessionStorage.getItem("wareflow.auth")).role'), as);
        console.log('PASS login', as, keyboard ? 'Enter' : 'button');
    }
    async function setField(label, value) { await evaluate(`(()=>{const field=[...document.querySelectorAll('label')].find(l=>l.textContent.trim().startsWith(${JSON.stringify(label)}));const el=field?.control||field?.querySelector('input,select,textarea');if(!el)throw Error('Missing field '+${JSON.stringify(label)});const setter=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),'value').set;setter.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`); }
    const clickText = text => evaluate(`[...document.querySelectorAll('button,a')].find(e=>e.textContent.trim()===${JSON.stringify(text)})?.click()`);
    await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/*' }] });

    await go('/login', '!!document.querySelector(".auth-submit")');
    assert.equal(await evaluate('location.pathname'), '/auth/login', 'login alias uses the real form');
    await evaluate('document.querySelector(".auth-submit").click()');
    await until('document.querySelectorAll("input[aria-invalid=true]").length === 2', 'required credentials');
    assert.equal(loginRequests.length, 0, 'empty credentials do not call API');
    await setField('Email công việc', 'test@example.com'); await setField('Mật khẩu', 'wrong-password');
    await evaluate('document.querySelector("#password").focus()'); await pressEnter();
    await until('document.querySelector(".auth-notice[role=alert]")?.textContent.includes("Email hoặc mật khẩu không chính xác")', 'invalid password message');
    assert.equal(await evaluate('sessionStorage.getItem("wareflow.auth")'), null, 'failed login cannot create a session');
    assert.equal(await evaluate('location.pathname'), '/auth/login');
    assert.equal(await evaluate('document.querySelector(".auth-submit").disabled'), false, 'login can be retried');
    const loginScreenshot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(path.join(profile, 'login.png'), Buffer.from(loginScreenshot.data, 'base64'));
    await login('SYSTEM_ADMIN', true);
    await go('/admin/dashboard');
    assert.equal(await evaluate('document.querySelector(".adm-stat-value").textContent'), '2', 'all company pages loaded');
    assert.ok(reads.some(url => url.includes('companies?') && url.includes('page=1')));
    await go('/admin/finance');
    assert.ok(await evaluate('document.querySelectorAll(".adm-stat-value")[0].textContent.includes("100")'));
    assert.ok(await evaluate('document.querySelectorAll(".adm-stat-value")[1].textContent.includes("25")'), 'expense includes fee once');
    assert.ok(await evaluate('document.querySelectorAll(".adm-stat-value")[2].textContent.includes("75")'));
    assert.equal(await evaluate('/NaN|Infinity/.test(document.body.innerText)'), false);
    await evaluate(`(()=>{const s=document.querySelector('[aria-label="Kỳ báo cáo"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,'365');s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await until('document.querySelectorAll(".adm-stat-value")[0].textContent.includes("150")', 'report range recalculated');
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await sleep(1500);
    const desktop = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(path.join(profile, 'finance-desktop.png'), Buffer.from(desktop.data, 'base64'));
    await send('Emulation.clearDeviceMetricsOverride');
    for (const route of ['/admin/companies', '/admin/companies/c1', '/admin/warehouses', '/admin/suppliers', '/admin/products', '/admin/users', '/admin/logs', '/admin/profile']) {
        await go(route); assert.equal(await evaluate('document.querySelectorAll(".wf-notice[role=alert]").length'), 0, route); console.log('PASS', route);
    }
    failNotifications = true; await go('/admin/notifications');
    await until('document.body.innerText.includes("Tạm mất kết nối thông báo")');
    failNotifications = false; await clickText('Thử lại'); await until('document.body.innerText.includes("Thông báo kiểm tra")');
    assert.equal(await evaluate('document.querySelectorAll(".wf-notice[role=alert]").length'), 0);
    await go('/admin/suppliers/new'); await setField('Tên nhà cung cấp', 'Nhà cung cấp mới');
    failSupplier = true; await evaluate('document.querySelector(".wf-card form").requestSubmit()');
    await until('document.body.innerText.includes("Nhà cung cấp đã tồn tại")');
    assert.equal(await evaluate('location.pathname'), '/admin/suppliers/new');
    failSupplier = false; await evaluate('document.querySelector(".wf-card form").requestSubmit()'); await until('location.pathname==="/admin/suppliers"');
    assert.ok(writes.some(w => w.p === '/api/core/suppliers' && w.body.name === 'Nhà cung cấp mới'));

    await login('COMPANY_ADMIN');
    for (const route of ['/company/dashboard', '/company/warehouses', '/company/inventory', '/company/finance', '/company/marketplace', '/company/employees', '/company/transfers', '/company/approvals', '/company/profile', '/company/budget/new', '/company/employees/new', '/company/transfers/new']) {
        await go(route); assert.equal(await evaluate('document.querySelectorAll(".wf-notice[role=alert]").length'), 0, route); console.log('PASS', route);
    }
    await go('/company/finance'); await clickText('Ghi nhận thu / chi');
    await setField('Nhóm giao dịch', 'OTHER'); await setField('Số tiền', '123456'); await setField('Nội dung', 'Khoản thu kiểm thử');
    await evaluate('document.querySelector(".adm-modal form").requestSubmit()');
    await until('!document.querySelector(".adm-modal")');
    assert.ok(writes.some(w => w.p === '/api/finance/transactions' && w.body.amount === 123456 && w.body.type === 'INCOME' && w.body.warehouseId === null));
    await go('/company/profile');
    await until('document.querySelector("input[name=name]")?.value==="Công ty A"');
    await setField('Tên công ty', 'Công ty cập nhật'); await evaluate('document.querySelector(".wf-profile-form").requestSubmit()');
    await until('document.body.innerText.includes("Đã lưu hồ sơ thành công.")');
    assert.ok(writes.some(w => w.p === '/api/core/companies/c1' && w.method === 'PUT' && w.body.name === 'Công ty cập nhật' && w.body.businessModel === 'TECH'));
    await login('WAREHOUSE_MANAGER');
    for (const route of ['/storehouse/inventory', '/storehouse/finance', '/storehouse/budget', '/storehouse/lots', '/storehouse/inbound', '/storehouse/outbound', '/storehouse/history', '/storehouse/shipments', '/storehouse/profile', '/storehouse/inbound/new', '/storehouse/outbound/new', '/storehouse/shipments/new']) {
        await go(route); assert.equal(await evaluate('document.querySelectorAll(".wf-notice[role=alert]").length'), 0, route); console.log('PASS', route);
    }
    await go('/storehouse/lots'); assert.ok(await evaluate('document.querySelector(".sl-numeric b").textContent==="9"'), 'available stock = 12 - 3');
    await go('/storehouse/inventory');
    await clickText('Thêm sản phẩm'); await setField('SKU', 'NEW-SKU'); await setField('Tên sản phẩm', 'Hàng mới'); await setField('Đơn vị tính', 'cái'); await setField('Tồn tối thiểu', '2');
    await evaluate('document.querySelector(".adm-modal form").requestSubmit()');
    await until('document.body.innerText.includes("Hàng mới") && !document.querySelector(".adm-modal")');
    assert.ok(writes.some(w => w.p === '/api/inventory/warehouses/w1/products' && w.body.sku === 'NEW-SKU' && w.body.minStock === 2));
    await evaluate(`(()=>{const s=document.querySelector('[aria-label="Kho đang làm việc"]');s.value='w2';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await until('!document.body.innerText.includes("Sản phẩm A")', 'changing warehouse drops old stock');
    await go('/storehouse/finance');
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await sleep(200); assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true, 'mobile overflow');
    const mobile = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(path.join(profile, 'finance-mobile.png'), Buffer.from(mobile.data, 'base64'));
    await send('Emulation.clearDeviceMetricsOverride');
    await go('/admin/dashboard'); await until('location.pathname==="/storehouse/inventory"', 'role guard');
    await evaluate("sessionStorage.removeItem('wareflow.auth');window.dispatchEvent(new Event('wareflow.auth'))"); await until('location.pathname==="/auth/login"', 'logout');
    assert.deepEqual(failures, []);
    assert.deepEqual(runtimeErrors, []);
    console.log('Screenshots:', profile);
    console.log('PASS: credential login, Enter/button submit, server role routing, authenticated APIs, pagination, charts, fees, error/retry, write failure/success, all role routes, warehouse switching, mobile and role guards');
} catch (error) {
    console.error('Browser diagnostics:', JSON.stringify({ runtimeErrors, networkErrors, failures, page: await evaluate?.('({url:location.href,ready:document.readyState,html:document.documentElement.outerHTML.slice(0,2000)})').catch(() => null) }, null, 2));
    throw error;
} finally { clearInterval(keepAlive); socket?.close(); chrome.kill(); }
