import { getAuthSession } from './authApi';
export type PoStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'DONE' | 'CANCELLED';
export type PoLine = { productId: string; productName: string; sku: string; unit: string; qty: number; price: number; receivedQty: number };
export type StockDocument = { id: string; status: PoStatus; createdAt: string; lines: PoLine[]; approval: { supplierName?: string; totalAmount?: number; expectedDeliveryDate?: string; note?: string } };
export type Product = { id: string; name: string; sku: string; unit: string };
export type Page<T> = { content: T[]; totalElements: number; totalPages: number };
export type CreatePo = { supplierName: string; expectedDeliveryDate?: string; note: string; submitImmediately: boolean; lines: { productId: string; qty: number; price: number }[] };
export type CreateReceipt = { poId: string; note: string; completePo: boolean; lines: { productId: string; receivedQty: number; lotCode: string; expiryDate?: string }[] };
const base = (import.meta.env.VITE_INVENTORY_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
async function request<T>(warehouse: string, path: string, body?: unknown): Promise<T> {
    const token = getAuthSession()?.accessToken;
    const response = await fetch(`${base}/warehouses/${encodeURIComponent(warehouse)}${path}`, {
        method: body === undefined ? 'GET' : 'POST', credentials: 'include',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000),
    });
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('API kho chưa được cấu hình hoặc phản hồi không hợp lệ.');
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || data.message || `Không thể xử lý yêu cầu (${response.status}).`);
    return data as T;
}
export const inboundApi = {
    list: (w: string, status: string, page: number) => request<Page<StockDocument>>(w, `/purchase-orders?page=${page}&size=10${status ? `&status=${status}` : ''}`),
    detail: (w: string, id: string) => request<StockDocument>(w, `/purchase-orders/${encodeURIComponent(id)}`),
    products: async (w: string) => {
        const products: Product[] = []; let page = 0; let result: Page<Product>;
        do { result = await request<Page<Product>>(w, `/products?size=100&page=${page++}`); products.push(...result.content); } while (page < result.totalPages);
        return products;
    },
    create: (w: string, body: CreatePo) => request<StockDocument>(w, '/purchase-orders', body),
    submit: (w: string, id: string) => request<StockDocument>(w, `/purchase-orders/${encodeURIComponent(id)}/submit`, {}),
    receive: (w: string, body: CreateReceipt) => request<StockDocument>(w, '/receipts', body),
};
