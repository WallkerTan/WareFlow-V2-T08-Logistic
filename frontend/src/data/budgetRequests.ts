import { useMemo, useSyncExternalStore } from 'react';

export type BudgetRequest = {
    id: string; warehouseId: string; warehouseName: string; company: string;
    amount: number; purpose: string; neededBy: string; createdAt: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    response?: string; resolvedAt?: string;
};
const KEY = 'wareflow-budget-requests-v1';
const EVENT = 'wareflow-budget-requests-changed';
const statuses = ['pending', 'approved', 'rejected', 'cancelled'];
const snapshot = () => localStorage.getItem(KEY);
function subscribe(listener: () => void) {
    const onStorage = (event: StorageEvent) => { if (event.key === KEY || event.key === null) listener(); };
    window.addEventListener('storage', onStorage);
    window.addEventListener(EVENT, listener);
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener(EVENT, listener); };
}
function parse(raw: string | null): BudgetRequest[] {
    try {
        const data: unknown = raw ? JSON.parse(raw) : [];
        return Array.isArray(data) ? data.filter((r): r is BudgetRequest => !!r && typeof r.id === 'string' && typeof r.warehouseId === 'string' && typeof r.warehouseName === 'string' && typeof r.company === 'string' && typeof r.purpose === 'string' && typeof r.neededBy === 'string' && typeof r.createdAt === 'string' && Number.isSafeInteger(r.amount) && r.amount > 0 && statuses.includes(r.status)) : [];
    } catch { return []; }
}
export function useBudgetRequests() {
    const raw = useSyncExternalStore(subscribe, snapshot);
    return useMemo(() => parse(raw), [raw]);
}
function save(items: BudgetRequest[]) {
    localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new Event(EVENT));
}
export function createBudgetRequest(input: Omit<BudgetRequest, 'id' | 'createdAt' | 'status'>) {
    if (!Number.isSafeInteger(input.amount) || input.amount <= 0 || !input.purpose.trim() || !input.warehouseId || !input.company || !/^\d{4}-\d{2}-\d{2}$/.test(input.neededBy)) throw Error('Vui lòng nhập đầy đủ thông tin và số tiền hợp lệ.');
    const item: BudgetRequest = { ...input, purpose: input.purpose.trim(), id: `NS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, createdAt: new Date().toISOString(), status: 'pending' };
    save([item, ...parse(snapshot())]);
    return item;
}
export function resolveBudgetRequest(id: string, status: 'approved' | 'rejected' | 'cancelled', response = '') {
    const items = parse(snapshot());
    const current = items.find(r => r.id === id);
    if (!current || current.status !== 'pending') throw Error('Yêu cầu đã được xử lý. Vui lòng kiểm tra lại.');
    if (status === 'rejected' && !response.trim()) throw Error('Vui lòng nhập lý do từ chối.');
    save(items.map(r => r.id === id ? { ...r, status, response: response.trim(), resolvedAt: new Date().toISOString() } : r));
}
export const budgetStatus = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối', cancelled: 'Đã hủy' };
export const budgetMoney = (value: number) => `${value.toLocaleString('vi-VN')} ₫`;
