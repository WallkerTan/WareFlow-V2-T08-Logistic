import { clearAuthSession, getAuthSession } from './session';
export type Row = Record<string, unknown>;
export type Page<T> = { content: T[]; totalPages: number; totalElements: number; number: number; size: number };
export type Service = 'core' | 'inventory' | 'finance' | 'delivery';
const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
export function endpoint(service: Service, path: string) { return `${base}/${service}${path}`; }
export function query(values: Record<string, string | number | boolean | null | undefined>) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) if (value !== '' && value !== null && value !== undefined) params.set(key, String(value));
    return params.size ? `?${params}` : '';
}
export class ApiError extends Error {
    readonly status: number;
    constructor(status: number, message: string) { super(message); this.name = 'ApiError'; this.status = status; }
}
export async function request<T>(service: Service, path: string, options: RequestInit = {}): Promise<T> {
    const token = getAuthSession()?.accessToken;
    const headers = new Headers(options.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
    headers.set('Accept', 'application/json');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    const signal = options.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal;
    try {
        const response = await fetch(endpoint(service, path), { ...options, headers, signal });
        if (!response.ok) {
            if (response.status === 401 && token) clearAuthSession();
            const data = await response.json().catch(() => null) as { message?: string; detail?: string } | null;
            throw new ApiError(response.status, data?.message || data?.detail || ({ 401: 'Phiên đăng nhập đã hết hạn.', 403: 'Bạn không có quyền thực hiện thao tác này.', 404: 'Không tìm thấy dữ liệu.', 409: 'Dữ liệu đã thay đổi hoặc đang được sử dụng.', 413: 'Ảnh vượt quá dung lượng cho phép.', 500: 'Máy chủ đang gặp lỗi. Vui lòng thử lại.', 502: 'Chưa kết nối được dịch vụ. Vui lòng thử lại.', 503: 'Dịch vụ đang không sẵn sàng.', 504: 'Dịch vụ phản hồi quá lâu. Vui lòng thử lại.' }[response.status] || `Yêu cầu thất bại (${response.status}).`));
        }
        if (response.status === 204 || response.headers.get('content-length') === '0') return undefined as T;
        const text = await response.text();
        if (!text) return undefined as T;
        if (!response.headers.get('content-type')?.includes('json')) throw new Error('API trả về nội dung không hợp lệ. Kiểm tra địa chỉ gateway.');
        try { return JSON.parse(text) as T; }
        catch (cause) { throw new Error('Máy chủ trả về dữ liệu không hợp lệ. Vui lòng thử lại.', { cause }); }
    } catch (error) {
        if (controller.signal.aborted) throw new Error('Máy chủ phản hồi quá lâu. Vui lòng thử lại.', { cause: error });
        if (error instanceof TypeError) throw new Error('Không kết nối được máy chủ. Vui lòng kiểm tra kết nối và thử lại.', { cause: error });
        throw error;
    } finally { window.clearTimeout(timeout); }
}
export function mutate<T = unknown>(service: Service, path: string, method: string, body?: unknown) {
    return request<T>(service, path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
/** Supports both PageImpl and Spring Data's stable PagedModel response, never invents rows. */
export function normalizeCollection<T>(value: unknown): Page<T> | T[] {
    const validRows = (items: unknown): items is T[] => Array.isArray(items) && items.every(row => row !== null && typeof row === 'object' && !Array.isArray(row));
    if (validRows(value)) return value;
    const source = object(value); const meta = source.page ? object(source.page) : source;
    if (!validRows(source.content) || !['totalPages', 'totalElements', 'number', 'size'].every(key => Number.isSafeInteger(meta[key]) && Number(meta[key]) >= (key === 'size' ? 1 : 0)))
        throw new Error('Máy chủ trả về danh sách không hợp lệ. Vui lòng tải lại.');
    return { content: source.content, totalPages: Number(meta.totalPages), totalElements: Number(meta.totalElements), number: Number(meta.number), size: Number(meta.size) };
}
export async function allPages<T>(service: Service, path: string, signal?: AbortSignal): Promise<T[]> {
    const separator = path.includes('?') ? '&' : '?';
    const first = normalizeCollection<T>(await request<unknown>(service, `${path}${separator}page=0&size=100`, { signal }));
    if (Array.isArray(first)) return first;
    const result = [...first.content];
    for (let page = 1; page < first.totalPages; page++) {
        const next = normalizeCollection<T>(await request<unknown>(service, `${path}${separator}page=${page}&size=100`, { signal }));
        if (Array.isArray(next) || next.number !== page) throw new Error('Không tải được đầy đủ danh sách. Vui lòng thử lại.');
        result.push(...next.content);
    }
    return result;
}
export function text(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}
export function object(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
export function rows(value: unknown): Row[] { return Array.isArray(value) ? value.map(object) : []; }
export function number(value: unknown): number { const result = Number(value); return Number.isFinite(result) ? result : 0; }
export const money = (value: unknown) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number(value));
export const date = (value: unknown) => value && !Number.isNaN(Date.parse(String(value))) ? new Date(String(value)).toLocaleString('vi-VN') : '—';
