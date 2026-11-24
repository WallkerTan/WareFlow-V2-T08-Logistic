export type CashEntry = { type: string; amount: number; createdAt: string };
const DAY = 86_400_000;
// Calendar boundaries are fixed to Vietnam, independent of the browser timezone.
export function dayKey(value: string | number | Date): string {
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? new Date(time + 7 * 3_600_000).toISOString().slice(0, 10) : '';
}
export function percentage(part: number, total: number): number | null {
    return Number.isFinite(part) && Number.isFinite(total) && total > 0 ? part / total * 100 : null;
}
export function growth(current: number, previous: number): number | null {
    if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
    return previous === 0 ? (current === 0 ? 0 : null) : (current - previous) / Math.abs(previous) * 100;
}
export function percentLabel(value: number | null) { return value === null ? '—' : `${value.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`; }
export function sumMoney(values: number[]) {
    // Sum minor units to avoid cumulative floating-point rounding in charts and totals.
    const minorUnits = values.reduce((sum, value) => {
        if (!Number.isFinite(value) || !Number.isSafeInteger(Math.round(value * 100))) throw new Error('Số tiền vượt phạm vi tính toán chính xác.');
        return sum + BigInt(Math.round(value * 100));
    }, 0n);
    if (minorUnits > BigInt(Number.MAX_SAFE_INTEGER) || minorUnits < BigInt(Number.MIN_SAFE_INTEGER)) throw new Error('Tổng tiền vượt phạm vi tính toán chính xác.');
    return Number(minorUnits) / 100;
}
export function cashSummary(entries: CashEntry[], isAdmin = false) {
    const income = sumMoney(entries.filter(r => r.type === 'INCOME' || (isAdmin && r.type === 'SYSTEM_FEE')).map(r => r.amount));
    const fee = sumMoney(entries.filter(r => r.type === 'SYSTEM_FEE').map(r => r.amount));
    const expense = sumMoney(entries.filter(r => r.type === 'EXPENSE' || (!isAdmin && r.type === 'SYSTEM_FEE')).map(r => r.amount));
    return { income, expense, fee, net: sumMoney([income, -expense]), margin: percentage(income - expense, income) };
}
export function inPeriod<T extends { createdAt: string }>(entries: T[], days: number, now = new Date(), previous = false): T[] {
    const end = Date.parse(dayKey(now)) + DAY - (previous ? days * DAY : 0);
    const start = end - days * DAY;
    return entries.filter(r => { const key = dayKey(r.createdAt); const time = Date.parse(key); return time >= start && time < end; });
}
export function cashSeries(entries: CashEntry[], days: number, now = new Date(), isAdmin = false) {
    const end = Date.parse(dayKey(now));
    const buckets = new Map<string, CashEntry[]>();
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(end - i * DAY).toISOString().slice(0, 10);
        const key = days > 60 ? date.slice(0, 7) : date;
        if (!buckets.has(key)) buckets.set(key, []);
    }
    for (const entry of inPeriod(entries, days, now)) {
        const key = dayKey(entry.createdAt).slice(0, days > 60 ? 7 : 10);
        buckets.get(key)?.push(entry);
    }
    return [...buckets].map(([key, list]) => {
        const sums = cashSummary(list, isAdmin);
        const label = days > 60 ? `${key.slice(5)}/${key.slice(0, 4)}` : `${key.slice(8)}/${key.slice(5, 7)}`;
        return { key, month: label, name: label, income: sums.income / 1e6, revenue: sums.income / 1e6, expense: sums.expense / 1e6, thu: sums.income / 1e6, chi: sums.expense / 1e6 };
    });
}
