import { useMemo, useSyncExternalStore } from 'react';
export type Status = 'available' | 'pending' | 'active' | 'returned';
export type Depot = { id: string; name: string; region: string; address: string; area: number; price: number; type: string; status: Status; company: string; image: string };
export const photos = ['photo-1586528116311-ad8dd3c8310d', 'photo-1565793298595-6d4b2f1c4f4c', 'photo-1486406146926-c627a92ad1ab'];
const initial: Depot[] = [
    { id: 'WH-001', name: 'Kho Logistics Tân Bình', region: 'Miền Nam', address: 'KCN Tân Bình, TP. Hồ Chí Minh', area: 2500, price: 125, type: 'Cho thuê', status: 'active', company: 'Công ty TNHH GreenMart', image: photos[0] },
    { id: 'WH-002', name: 'Kho trung tâm Long Biên', region: 'Miền Bắc', address: 'Long Biên, Hà Nội', area: 1800, price: 90, type: 'Cho thuê', status: 'available', company: '', image: photos[2] },
    { id: 'WH-003', name: 'Kho công nghiệp Bình Dương', region: 'Miền Nam', address: 'KCN Sóng Thần, Bình Dương', area: 4200, price: 18500, type: 'Mua bán', status: 'pending', company: 'Công ty CP TechViet', image: photos[0] },
    { id: 'WH-004', name: 'Kho phân phối Đà Nẵng', region: 'Miền Trung', address: 'KCN Hòa Khánh, Đà Nẵng', area: 1200, price: 65, type: 'Cho thuê', status: 'available', company: '', image: photos[2] },
    { id: 'WH-005', name: 'Kho lạnh Thủ Đức', region: 'Miền Nam', address: 'TP. Thủ Đức, TP. Hồ Chí Minh', area: 3000, price: 210, type: 'Cho thuê', status: 'active', company: 'Công ty TNHH FreshFood', image: photos[0] },
    { id: 'WH-006', name: 'Kho tổng hợp Hải Phòng', region: 'Miền Bắc', address: 'KCN Đình Vũ, Hải Phòng', area: 3500, price: 15200, type: 'Mua bán', status: 'returned', company: '', image: photos[2] },
    { id: 'WH-007', name: 'Kho hàng Biên Hòa', region: 'Miền Nam', address: 'KCN Amata, Đồng Nai', area: 2200, price: 110, type: 'Cho thuê', status: 'available', company: '', image: photos[0] },
    { id: 'WH-008', name: 'Kho phân phối Bắc Ninh', region: 'Miền Bắc', address: 'KCN Tiên Sơn, Bắc Ninh', area: 2800, price: 140, type: 'Cho thuê', status: 'pending', company: 'Công ty CP HomeLiving', image: photos[2] },
];

const KEY = 'wareflow-depots-v1';
const EVENT = 'wareflow-warehouses-changed';
function snapshot() { return localStorage.getItem(KEY); }
function subscribe(listener: () => void) {
 const onStorage = (event: StorageEvent) => { if (event.key === KEY || event.key === null) listener(); };
 window.addEventListener('storage', onStorage);
 window.addEventListener(EVENT, listener);
 return () => { window.removeEventListener('storage', onStorage); window.removeEventListener(EVENT, listener); };
}
export function saveDepots(items: Depot[]) {
 localStorage.setItem(KEY, JSON.stringify(items));
 window.dispatchEvent(new Event(EVENT));
}
export function useDepots(): Depot[] {
 const raw = useSyncExternalStore(subscribe, snapshot);
 return useMemo(() => { try { const parsed = raw ? JSON.parse(raw) : initial; return Array.isArray(parsed) ? parsed : initial; } catch { return initial; } }, [raw]);
}
