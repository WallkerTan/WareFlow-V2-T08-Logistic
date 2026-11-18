import { dayKey } from '../utils/analytics';
export type LotStatus = 'ok' | 'near_expiry' | 'expired' | 'damaged';
export type Product = { id: string; sku: string; barcode: string; name: string; unit: string; min_stock: number };
export type StockLot = { id: string; product_id: string; lot_code: string; expiry_date: string | null; quantity: number; reserved: number; status: LotStatus; created_at: string };

export function daysRemaining(expiry: string) {
    return Math.round((Date.parse(expiry) - Date.parse(dayKey(new Date()))) / 86400000);
}
export function lotStatus(lot: StockLot, threshold: number): LotStatus {
    if (lot.status === 'damaged') return 'damaged';
    if (!lot.expiry_date) return lot.status;
    const days = daysRemaining(lot.expiry_date);
    return days < 0 ? 'expired' : days <= threshold ? 'near_expiry' : 'ok';
}
export function availableQuantity(lot: StockLot, threshold: number) {
    const status = lotStatus(lot, threshold);
    return status === 'expired' || status === 'damaged' ? 0 : Math.max(0, lot.quantity - lot.reserved);
}
