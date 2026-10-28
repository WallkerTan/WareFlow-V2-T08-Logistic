// Real Chrome + Chrome DevTools Protocol; no additional test dependency.
// Run with the Vite server active: node tests/auth.e2e.mjs
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
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
let mocked = true;
let status = 200;
let delay = 0;
const requests = [];
const errors = [];
const keepAlive = setInterval(() => {}, 1000);
try {
    let targets;
    for (let i = 0; i < 100; i++) {
        try { targets = await (await fetch('http://127.0.0.1:9223/json')).json(); break; } catch { await sleep(100); }
    }
    assert.ok(targets, 'Chrome debugging endpoint available');
    socket = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let seq = 0;
    const pending = new Map();
    function send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = ++seq;
            const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 10000);
            pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
            socket.send(JSON.stringify({ id, method, params }));
        });
    }
    socket.onmessage = async ({ data }) => {
        const message = JSON.parse(data);
        if (message.id) {
            const task = pending.get(message.id);
            pending.delete(message.id);
            if (message.error) task?.reject(new Error(message.error.message)); else task?.resolve(message.result);
        }
        if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
        if (message.method === 'Fetch.requestPaused') {
            const { requestId, request } = message.params;
            requests.push({ url: request.url, method: request.method, headers: request.headers, body: JSON.parse(request.postData) });
            const responseStatus = status;
            const responseDelay = delay;
            if (!mocked) { await send('Fetch.continueRequest', { requestId }); return; }
            if (responseDelay) await sleep(responseDelay);
            try {
                await send('Fetch.fulfillRequest', {
                    requestId, responseCode: responseStatus,
                    responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Set-Cookie', value: 'wareflow_test_session=fixture; HttpOnly; SameSite=Lax; Path=/' }],
                    body: Buffer.from(JSON.stringify(responseStatus < 300 ? { user: { fullName: 'Nguyễn Văn An' } } : { message: 'fixture error' })).toString('base64'),
                });
            } catch { /* timeout cancels paused request */ }
        }
    };
    const evaluate = async expression => {
        const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
        return result.result.value;
    };
    async function until(expression, timeout = 7000) {
        const deadline = Date.now() + timeout;
        while (Date.now() < deadline) { if (await evaluate(expression)) return; await sleep(50); }
        throw new Error(`Timed out waiting for: ${expression}`);
    }
    const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
    async function fill(id, value) {
        await evaluate(`(() => { const input = document.getElementById(${JSON.stringify(id)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    }
    async function navigate(route) {
        await send('Page.navigate', { url: `${origin}${route}` });
        await until('!!document.querySelector(".auth-submit")');
    }
    const textIncludes = text => `document.body.innerText.includes(${JSON.stringify(text)})`;
    async function check(name, run) {
        try { await run(); } catch (error) {
            console.error('Form diagnostics:', await evaluate('({ errors: [...document.querySelectorAll(".field-error")].map(e => e.textContent), notice: document.querySelector(".auth-notice")?.textContent, checked: document.querySelector("input[type=checkbox]")?.checked })'));
            throw error;
        }
        checks.push(name); console.log(`PASS ${name}`);
    }
    await send('Browser.getVersion');
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Network.enable');
    await send('Fetch.enable', { patterns: [{ urlPattern: '*/api/auth/*', requestStage: 'Request' }] });

    await check('Root redirects to login', async () => {
        await navigate('/');
        await until('location.pathname === "/auth/login"');
    });
    await check('Empty login validates without API request', async () => {
        await click('.auth-submit');
        await until('document.querySelectorAll(".field-error").length === 2');
        assert.equal(requests.length, 0);
    });
    await check('Invalid email rejected', async () => {
        await fill('email', 'bad-email'); await fill('password', 'Password123!');
        await click('.auth-submit'); await until(textIncludes('Email không hợp lệ.'));
        assert.equal(requests.length, 0);
    });
    await check('Password visibility toggles', async () => {
        await click('.password-toggle'); assert.equal(await evaluate('document.querySelector("#password").type'), 'text');
        await click('.password-toggle'); assert.equal(await evaluate('document.querySelector("#password").type'), 'password');
    });
    await check('Login POST, normalized email, remember, loading, success', async () => {
        await fill('email', 'Admin@Wareflow.vn'); await click('input[type=checkbox]');
        delay = 400;
        await click('.auth-submit'); await until('document.querySelector(".auth-submit").disabled');
        await until(textIncludes('Đăng nhập thành công.'));
        delay = 0;
        const request = requests.at(-1);
        assert.equal(request.method, 'POST');
        assert.equal(new URL(request.url).pathname, '/api/auth/login');
        assert.deepEqual(request.body, { email: 'admin@wareflow.vn', password: 'Password123!', remember: true });
        assert.equal(await evaluate('document.querySelector(".auth-submit").disabled'), false);
        const cookies = await send('Network.getCookies', { urls: [origin] });
        assert.equal(cookies.cookies.find(c => c.name === 'wareflow_test_session')?.httpOnly, true);
        assert.equal(await evaluate('document.cookie.includes("wareflow_test_session")'), false);
    });
    for (const [code, message] of [[400, 'Thông tin gửi lên chưa hợp lệ'], [401, 'Email hoặc mật khẩu không chính xác'], [403, 'Tài khoản chưa được phép'], [404, 'API xác thực chưa được cấu hình'], [409, 'đã được đăng ký'], [422, 'Thông tin chưa đáp ứng'], [429, 'Bạn đã thử quá nhiều lần'], [500, 'Dịch vụ xác thực đang gặp sự cố']]) {
        await check(`API ${code} shows actionable error and allows retry`, async () => {
            status = code; await click('.auth-submit'); await until(textIncludes(message));
            assert.equal(await evaluate('document.querySelector(".auth-submit").disabled'), false);
        });
    }
    status = 200;
    await check('Timeout aborts and allows retry', async () => {
        delay = 16000; await click('.auth-submit');
        await until(textIncludes('Máy chủ phản hồi quá lâu'), 18000);
        assert.equal(await evaluate('document.querySelector(".auth-submit").disabled'), false);
        await sleep(1100); delay = 0;
    });
    await check('Navigation to registration', async () => {
        await click('.auth-tabs a[href="/auth/register"]');
        await until('!!document.querySelector("#companyName")');
        assert.equal(await evaluate('location.pathname'), '/auth/register');
    });
    await check('Empty registration validates all required inputs without request', async () => {
        const before = requests.length;
        await click('.auth-submit'); await until('document.querySelectorAll(".field-error").length === 8');
        assert.equal(requests.length, before);
    });
    await check('Invalid tax code, phone, short password, confirmation and consent rejected', async () => {
        await fill('companyName', '   '); await fill('fullName', '   ');
        await fill('taxCode', '123'); await fill('phone', 'abc'); await fill('email', 'bad');
        await fill('password', '123'); await fill('confirmPassword', '456');
        await click('.auth-submit');
        await until(textIncludes('Mật khẩu cần ít nhất 8 ký tự.'));
        assert.equal(await evaluate('document.querySelectorAll(".field-error").length'), 8);
    });
    async function fillCompany() {
        for (const [id, value] of Object.entries({ companyName: ' Công ty WareFlow ', taxCode: '0123456789-001', fullName: ' Nguyễn Văn An ', phone: '+84 901 234 567', email: 'Admin@Wareflow.vn', password: 'Password123!', confirmPassword: 'Password123!' })) await fill(id, value);
        await click('input[type=checkbox]');
    }
    await check('Registration POST strips confirmation/consent, normalizes data, success clears password', async () => {
        await fillCompany(); await click('.auth-submit');
        await until(textIncludes('Đăng ký công ty thành công.'));
        assert.equal(new URL(requests.at(-1).url).pathname, '/api/auth/register');
        assert.deepEqual(requests.at(-1).body, { companyName: 'Công ty WareFlow', taxCode: '0123456789001', fullName: 'Nguyễn Văn An', phone: '+84901234567', email: 'admin@wareflow.vn', password: 'Password123!' });
        assert.equal(await evaluate('document.querySelector("#password").value'), '');
    });
    await check('Duplicate registration keeps form values for correction', async () => {
        status = 409; await fillCompany(); await click('.auth-submit');
        await until(textIncludes('Email hoặc mã số thuế đã được đăng ký.'));
        assert.equal(await evaluate('document.querySelector("#email").value'), 'Admin@Wareflow.vn');
    });
    await mkdir('test-results', { recursive: true });
    await check('Desktop and mobile layouts fit viewport', async () => {
        for (const route of ['/auth/login', '/auth/register']) {
            for (const width of [1440, 768, 390, 320]) {
                await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 768 });
                await navigate(route);
                assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `${route} at ${width}px`);
                const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
                await writeFile(`test-results/${route.split('/').at(-1)}-${width}.png`, Buffer.from(screenshot.data, 'base64'));
            }
        }
    });
    await check('Legacy /login and /register aliases work', async () => {
        await navigate('/login'); await until('location.pathname === "/auth/login"');
        await navigate('/register'); await until('location.pathname === "/auth/register"');
    });
    await check('Real backend unavailable shows error, no false success', async () => {
        mocked = false; await navigate('/auth/login');
        await fill('email', 'admin@wareflow.vn'); await fill('password', 'Password123!');
        await click('.auth-submit'); await until('!!document.querySelector(".auth-notice-error")');
        assert.equal(await evaluate('!!document.querySelector(".auth-notice-success")'), false);
    });
    assert.deepEqual(errors, [], 'No uncaught browser exceptions');
    await writeFile('test-results/auth-report.json', JSON.stringify({ checkedAt: new Date().toISOString(), origin, mode: 'Real Chrome; mocked API responses except backend-unavailable check. No live backend auth or database verification.', passed: checks, requests: requests.map(r => ({ method: r.method, path: new URL(r.url).pathname })), browserExceptions: errors }, null, 2));
    console.log(`\n${checks.length} checks passed. Screenshots/report: test-results/`);
} finally {
    clearInterval(keepAlive);
    socket?.close();
    chrome.kill();
    await sleep(1000);
    const resolved = path.resolve(profile);
    if (resolved.startsWith(`${path.resolve(tmpdir())}${path.sep}`) && path.basename(resolved).startsWith('wareflow-auth-test-')) {
        await rm(resolved, { recursive: true, force: true, maxRetries: 3 }).catch(() => {});
    }
}
