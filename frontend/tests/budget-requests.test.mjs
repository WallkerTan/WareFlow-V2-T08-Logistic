import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';
import ts from 'typescript';

// Run the actual store with browser storage and events replaced in memory.
const source = (await readFile(new URL('../src/data/budgetRequests.ts', import.meta.url), 'utf8')).replace(/^import .* from 'react';\r?\n/, '');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const store = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
let values;
beforeEach(() => {
    values = new Map();
    globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
    globalThis.window = new EventTarget();
});
const input = { warehouseId: 'WH-001', warehouseName: 'Kho thử nghiệm', company: 'Công ty thử nghiệm', amount: 25000000, purpose: 'Chi phí vận hành', neededBy: '2027-01-20' };
const saved = () => JSON.parse(values.get('wareflow-budget-requests-v1'));

test('request persists, approval updates it once, and preserves the requested amount', () => {
    const request = store.createBudgetRequest(input);
    assert.equal(saved()[0].status, 'pending');
    store.resolveBudgetRequest(request.id, 'approved', 'Đồng ý');
    assert.equal(saved()[0].status, 'approved');
    assert.equal(saved()[0].amount, input.amount);
    assert.ok(saved()[0].resolvedAt);
    assert.throws(() => store.resolveBudgetRequest(request.id, 'cancelled'));
});
test('rejection needs a reason and cancellation leaves other warehouses untouched', () => {
    const first = store.createBudgetRequest(input);
    const second = store.createBudgetRequest({ ...input, warehouseId: 'WH-002' });
    assert.throws(() => store.resolveBudgetRequest(first.id, 'rejected', ' '));
    store.resolveBudgetRequest(first.id, 'rejected', 'Cần dự toán chi tiết');
    store.resolveBudgetRequest(second.id, 'cancelled');
    assert.equal(saved().find(r => r.id === first.id).status, 'rejected');
    assert.equal(saved().find(r => r.id === second.id).status, 'cancelled');
});
test('rejects invalid amounts and blank purposes without writing records', () => {
    for (const amount of [0, -1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
        assert.throws(() => store.createBudgetRequest({ ...input, amount }));
    }
    assert.throws(() => store.createBudgetRequest({ ...input, purpose: '  ' }));
    assert.equal(values.size, 0);
});
test('storage failures surface instead of claiming submission succeeded', () => {
    globalThis.localStorage.setItem = () => { throw Error('Storage full'); };
    assert.throws(() => store.createBudgetRequest(input), /Storage full/);
});
