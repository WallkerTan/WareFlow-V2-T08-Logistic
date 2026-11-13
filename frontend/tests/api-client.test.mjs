import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApiClient } from './load-api-client.mjs';

let session = null;
const api = await loadApiClient({ getAuthSession: () => session, clearAuthSession: () => { session = null; } });
const originalFetch = globalThis.fetch;
const reply = value => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
test.afterEach(() => { globalThis.fetch = originalFetch; session = null; });

test('uses the gateway prefix and JWT for JSON mutations', async () => {
    session = { accessToken: 'unit-token' };
    globalThis.fetch = async (url, options) => {
        assert.equal(url, '/api/core/customers');
        assert.equal(options.headers.get('Authorization'), 'Bearer unit-token');
        assert.equal(options.headers.get('Content-Type'), 'application/json');
        assert.deepEqual(JSON.parse(options.body), { name: 'Contract-only record' });
        return reply({ id: 'record' });
    };
    assert.equal((await api.mutate('core', '/customers', 'POST', { name: 'Contract-only record' })).id, 'record');
});
test('lets the browser supply the multipart boundary', async () => {
    const form = new FormData(); form.append('folder', 'products');
    globalThis.fetch = async (_url, options) => { assert.equal(options.headers.has('Content-Type'), false); assert.equal(options.body, form); return reply({ secureUrl: '/image' }); };
    await api.request('core', '/upload/image', { method: 'POST', body: form });
});
test('normalizes PageImpl, PagedModel and array lists without manufacturing content', () => {
    const row = { id: 'record' };
    const page = { content: [row], size: 20, number: 0, totalPages: 1, totalElements: 1 };
    assert.deepEqual(api.normalizeCollection(page), page);
    assert.deepEqual(api.normalizeCollection({ content: [row], page: { size: 20, number: 0, totalPages: 1, totalElements: 1 } }), page);
    assert.deepEqual(api.normalizeCollection([]), []);
    for (const value of [null, {}, { content: [] }, { content: [null] }, [null], { ...page, totalPages: '1' }]) assert.throws(() => api.normalizeCollection(value));
});
test('loads every page from the real response metadata', async () => {
    let calls = 0;
    globalThis.fetch = async url => {
        const page = Number(new URL(url, 'http://frontend').searchParams.get('page')); calls++;
        return reply({ content: [{ id: `page-${page}` }], page: { size: 100, number: page, totalPages: 2, totalElements: 2 } });
    };
    assert.deepEqual(await api.allPages('core', '/warehouses'), [{ id: 'page-0' }, { id: 'page-1' }]); assert.equal(calls, 2);
});
test('rejects a service that ignores pagination instead of duplicating rows', async () => {
    globalThis.fetch = async () => reply({ content: [{ id: 'record' }], size: 100, number: 0, totalPages: 2, totalElements: 2 });
    await assert.rejects(api.allPages('core', '/warehouses'));
});
test('clears an expired session on 401 but keeps it on 403', async () => {
    session = { accessToken: 'unit-token' }; globalThis.fetch = async () => new Response('{}', { status: 403 });
    await assert.rejects(api.request('core', '/users/me'), error => error.status === 403); assert.ok(session);
    globalThis.fetch = async () => new Response('{}', { status: 401 });
    await assert.rejects(api.request('core', '/users/me'), error => error.status === 401); assert.equal(session, null);
});
test('rejects HTML fallbacks and corrupt JSON; never substitutes empty rows', async () => {
    globalThis.fetch = async () => new Response('<html>Vite</html>', { headers: { 'Content-Type': 'text/html' } });
    await assert.rejects(api.request('inventory', '/warehouses/id/products'));
    globalThis.fetch = async () => new Response('{invalid', { headers: { 'Content-Type': 'application/json' } });
    await assert.rejects(api.request('inventory', '/warehouses/id/products'));
});
test('keeps backend validation messages and outage status', async () => {
    globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'Stock changed' }), { status: 409, headers: { 'Content-Type': 'application/problem+json' } });
    await assert.rejects(api.request('inventory', '/exports'), error => error.status === 409 && error.message === 'Stock changed');
    globalThis.fetch = async () => new Response('', { status: 502 });
    await assert.rejects(api.request('finance', '/budgets'), error => error.status === 502);
});
