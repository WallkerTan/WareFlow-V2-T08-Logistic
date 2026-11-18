import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function moduleUrl(file, replacements = []) {
    let source = fs.readFileSync(new URL(file, import.meta.url), 'utf8').replaceAll('import.meta.env', '({})');
    for (const [from, to] of replacements) source = source.replaceAll(from, to);
    const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
    return 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
}
const math = await import(moduleUrl('../src/utils/analytics.ts'));
const storage = new Map();
globalThis.sessionStorage = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) };
globalThis.window = { setTimeout, clearTimeout, dispatchEvent: () => {} };
const authUrl = moduleUrl('../src/services/authApi.ts');
const auth = await import(authUrl);
const api = await import(moduleUrl('../src/services/api.ts', [["'./authApi'", JSON.stringify(authUrl)]]));
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; storage.clear(); });
const now = new Date('2026-01-01T18:00:00Z'); // January 2 in Vietnam.
const session = () => storage.set('wareflow.auth', JSON.stringify({ accessToken: 'test-token', userId: 'u1', role: 'SYSTEM_ADMIN', expiresAt: '2999-01-01T00:00:00Z' }));
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

test('Vietnam calendar boundaries and disjoint comparison periods', () => {
    assert.equal(math.dayKey('2025-12-31T17:00:00Z'), '2026-01-01');
    assert.equal(math.dayKey('invalid'), '');
    const entries = ['2025-12-31T16:59:59Z', '2025-12-31T17:00:00Z', '2026-01-01T16:59:59Z', '2026-01-01T17:00:00Z', '2026-01-02T17:00:00Z'].map(createdAt => ({ createdAt }));
    assert.deepEqual(math.inPeriod(entries, 1, now), [entries[3]]);
    assert.deepEqual(math.inPeriod(entries, 1, now, true), [entries[1], entries[2]]);
});
test('money uses exact minor units and counts system fees once', () => {
    assert.equal(math.sumMoney([0.1, 0.2]), 0.3);
    const sums = math.cashSummary([{ type: 'INCOME', amount: 100, createdAt: '' }, { type: 'EXPENSE', amount: 20, createdAt: '' }, { type: 'SYSTEM_FEE', amount: 5, createdAt: '' }]);
    assert.deepEqual(sums, { income: 100, expense: 25, fee: 5, net: 75, margin: 75 });
    assert.throws(() => math.sumMoney([Infinity]));
    assert.throws(() => math.sumMoney([90_000_000_000_000, 90_000_000_000_000]));
});
test('zero baselines never create NaN or infinite growth', () => {
    assert.equal(math.percentage(12, 0), null);
    assert.equal(math.growth(0, 0), 0);
    assert.equal(math.growth(100, 0), null);
    assert.equal(math.growth(150, 100), 50);
    assert.equal(math.growth(5, -5), 200);
    assert.equal(math.growth(Infinity, 0), null);
    assert.equal(math.cashSummary([]).margin, null);
    assert.equal(math.percentLabel(null), '—');
});
test('charts fill empty days, split calendar years and reconcile to totals', () => {
    const entries = [{ type: 'INCOME', amount: 1_000_000, createdAt: '2026-01-01T18:00:00Z' }, { type: 'SYSTEM_FEE', amount: 50000, createdAt: '2025-12-20T00:00:00Z' }];
    const daily = math.cashSeries(entries, 30, now);
    assert.equal(daily.length, 30);
    assert.equal(daily.at(-1).key, '2026-01-02');
    assert.equal(daily.at(-1).income, 1);
    assert.equal(daily[0].income, 0);
    const annual = math.cashSeries(entries, 365, now);
    assert.equal(annual[0].key, '2025-01');
    assert.equal(annual.at(-1).key, '2026-01');
    assert.equal(annual.reduce((n, b) => n + b.income, 0), 1);
    assert.equal(annual.reduce((n, b) => n + b.expense, 0), 0.05);
});
test('API sends bearer tokens, JSON bodies and encoded filters', async () => {
    session();
    globalThis.fetch = async (url, options) => {
        assert.equal(url, '/api/finance/budgets');
        assert.equal(options.headers.get('Authorization'), 'Bearer test-token');
        assert.equal(options.headers.get('Content-Type'), 'application/json');
        assert.deepEqual(JSON.parse(options.body), { allocated: 123 });
        return json({ id: 'b1' }, 201);
    };
    assert.deepEqual(await api.mutate('finance', '/budgets', 'POST', { allocated: 123 }), { id: 'b1' });
    assert.equal(api.query({ note: 'a&b', amount: 0, absent: null }), '?note=a%26b&amount=0');
});
test('API validates collection shapes and retrieves all pages', async () => {
    let calls = 0;
    globalThis.fetch = async url => { const page = Number(new URL(url, 'http://test').searchParams.get('page')); calls++; return json({ content: [{ id: page }], page: { totalPages: 3, totalElements: 3, number: page, size: 1 } }); };
    assert.deepEqual(await api.allPages('core', '/companies?status=ACTIVE'), [{ id: 0 }, { id: 1 }, { id: 2 }]);
    assert.equal(calls, 3);
    assert.throws(() => api.normalizeCollection({ content: [null] }));
    assert.throws(() => api.normalizeCollection({ content: [], totalPages: '3' }));
    assert.deepEqual(api.normalizeCollection([]), []);
});
test('HTTP failures and invalid HTML never become successful data; 401 clears auth', async () => {
    session();
    globalThis.fetch = async () => json({ message: 'Not authorized' }, 401);
    await assert.rejects(api.request('core', '/users/me'), e => e.status === 401);
    assert.equal(auth.getAuthSession(), null);
    globalThis.fetch = async () => new Response('<html>fallback</html>', { headers: { 'Content-Type': 'text/html' } });
    await assert.rejects(api.request('core', '/companies'), /không hợp lệ/);
    globalThis.fetch = async () => new Response(null, { status: 204 });
    assert.equal(await api.mutate('core', '/suppliers/id', 'DELETE'), undefined);
});
test('incomplete or changing pages cannot silently undercount chart totals', async () => {
    globalThis.fetch = async () => json({ content: [{ id: 'one' }], totalPages: 1, totalElements: 2, number: 0, size: 100 });
    await assert.rejects(api.allPages('finance', '/transactions'), /đầy đủ/);
    globalThis.fetch = async url => {
        const page = Number(new URL(url, 'http://test').searchParams.get('page'));
        return json({ content: [{ id: 'repeated' }], totalPages: 2, totalElements: 2, number: page, size: 1 });
    };
    await assert.rejects(api.allPages('finance', '/transactions'), /trùng/);
});
test('malformed or expired auth sessions are rejected', () => {
    storage.set('wareflow.auth', JSON.stringify({ accessToken: 'x', userId: 'u', role: 'SYSTEM_ADMIN', expiresAt: 'invalid' }));
    assert.equal(auth.getAuthSession(), null);
    storage.set('wareflow.auth', JSON.stringify({ accessToken: 'x', userId: 'u', role: 'SYSTEM_ADMIN', expiresAt: '2000-01-01' }));
    assert.equal(auth.getAuthSession(), null);
});
