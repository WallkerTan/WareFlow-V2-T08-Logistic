// Read-only check through the actual frontend proxy/gateway. Never intercepts responses or inserts business data.
import assert from 'node:assert/strict';
import { loadApiClient } from './load-api-client.mjs';

const baseURL = process.env.LIVE_API_BASE_URL || 'http://127.0.0.1:5173/api';
let session = process.env.LIVE_API_TOKEN ? { accessToken: process.env.LIVE_API_TOKEN } : null;
const api = await loadApiClient({ baseURL, getAuthSession: () => session, clearAuthSession: () => { session = null; } });
try {
    const id = '00000000-0000-0000-0000-000000000000';
    // A secured response proves the request reached the service, rather than Vite's HTML fallback.
    const probes = [['core', '/users/me'], ['inventory', `/warehouses/${id}/products`], ['finance', '/budgets'], ['delivery', `/warehouses/${id}/shipments`]];
    let failed = false;
    const savedSession = session; session = null;
    for (const [service, endpoint] of probes) {
        try { await api.request(service, endpoint); console.error(`FAIL ${service}: protected endpoint allowed anonymous access`); failed = true; }
        catch (error) { if ([401, 403].includes(error.status)) console.log(`PASS ${service}: reached protected API`); else { failed = true; console.error(`FAIL ${service}: ${error.message}`); } }
    }
    session = savedSession;
    assert.equal(failed, false, 'Start the backend services and gateway, then check API_PROXY_TARGET.');
    if (!session && process.env.LIVE_API_EMAIL && process.env.LIVE_API_PASSWORD) {
        session = await api.mutate('core', '/auth/login', 'POST', { email: process.env.LIVE_API_EMAIL, password: process.env.LIVE_API_PASSWORD });
        assert.ok(session.accessToken, 'Backend did not issue a JWT');
    }
    if (!session) { console.log('PASS service routing. Set LIVE_API_TOKEN or LIVE_API_EMAIL + LIVE_API_PASSWORD to verify authenticated data.'); }
    else {
        const user = await api.request('core', '/users/me'); assert.ok(user.id || user.userId); assert.ok(user.role);
        const warehouses = await api.allPages('core', user.role === 'SYSTEM_ADMIN' ? '/warehouses' : '/warehouses/my-company');
        await api.allPages('core', '/suppliers');
        const notifications = await api.request('core', '/notifications'); assert.ok(Array.isArray(notifications));
        const assigned = warehouses.find(w => user.role !== 'WAREHOUSE_MANAGER' || w.handover?.managerId === user.id);
        if (assigned) {
            await api.allPages('inventory', `/warehouses/${assigned.id}/products`);
            await api.allPages('delivery', `/warehouses/${assigned.id}/shipments`);
            if (assigned.ownerCompanyId) await api.allPages('finance', `/budgets?companyId=${assigned.ownerCompanyId}&warehouseId=${assigned.id}`);
        }
        console.log(`PASS authenticated data for ${user.role}; ${warehouses.length} warehouses read. No business records created.`);
    }
} catch (error) { console.error(error.message); process.exitCode = 1; }
