export type Role = 'SYSTEM_ADMIN' | 'COMPANY_ADMIN' | 'WAREHOUSE_MANAGER';
export type Session = {
    accessToken: string; tokenType: string; expiresAt: string; userId: string;
    email: string; fullName: string; role: Role; companyId: string | null; companyName: string | null;
};
const KEY = 'wareflow.auth';
const EVENT = 'wareflow.session';
export function sessionSnapshot() { return sessionStorage.getItem(KEY) || localStorage.getItem(KEY); }
export function getAuthSession(): Session | null {
    try {
        const session = JSON.parse(sessionSnapshot() || 'null') as Session | null;
        if (!session?.accessToken || !['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'WAREHOUSE_MANAGER'].includes(session.role)
            || !Number.isFinite(Date.parse(session.expiresAt)) || Date.parse(session.expiresAt) <= Date.now()) return null;
        return session;
    } catch { return null; }
}
export function saveSession(session: Session, remember = false) {
    if (!session.accessToken || !session.role) throw new Error('Máy chủ chưa cấp phiên đăng nhập hợp lệ.');
    sessionStorage.removeItem(KEY); localStorage.removeItem(KEY);
    (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(session));
    window.dispatchEvent(new Event(EVENT));
}
export function clearAuthSession() {
    sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); window.dispatchEvent(new Event(EVENT));
}
export function subscribeSession(listener: () => void) {
    window.addEventListener(EVENT, listener); window.addEventListener('storage', listener);
    return () => { window.removeEventListener(EVENT, listener); window.removeEventListener('storage', listener); };
}
export function roleHome(role: Role) {
    return role === 'SYSTEM_ADMIN' ? '/admin/dashboard' : role === 'COMPANY_ADMIN' ? '/company/dashboard' : '/storehouse/inventory';
}
export function expireSessionAt(expiresAt: string) {
    const timer = window.setTimeout(clearAuthSession, Math.max(1, Date.parse(expiresAt) - Date.now()));
    return () => window.clearTimeout(timer);
}
