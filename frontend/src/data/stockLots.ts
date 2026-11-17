export type LotStatus = 'ok' | 'near_expiry' | 'expired' | 'damaged';
export type Product = { id: string; sku: string; barcode: string; name: string; unit: string; min_stock: number };
export type StockLot = { id: string; product_id: string; lot_code: string; expiry_date: string | null; quantity: number; reserved: number; status: LotStatus; created_at: string };

export const products: Product[] = [
    { id: 'p1', sku: 'TP-001', barcode: '8934567000012', name: 'Sữa tươi tiệt trùng', unit: 'Hộp', min_stock: 200 },
    { id: 'p2', sku: 'TP-002', barcode: '8934567000029', name: 'Bánh quy bơ', unit: 'Hộp', min_stock: 100 },
    { id: 'p3', sku: 'TP-003', barcode: '8934567000036', name: 'Nước cam nguyên chất', unit: 'Chai', min_stock: 150 },
    { id: 'p4', sku: 'TP-004', barcode: '8934567000043', name: 'Mì ăn liền', unit: 'Thùng', min_stock: 80 },
    { id: 'p5', sku: 'TP-005', barcode: '8934567000050', name: 'Cà phê rang xay', unit: 'Gói', min_stock: 50 },
    { id: 'p6', sku: 'TP-006', barcode: '8934567000067', name: 'Gạo thơm ST25', unit: 'Bao', min_stock: 100 },
];

// Relative dates keep the preview useful whenever it is opened.
export function dateAfter(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export const stockLots: StockLot[] = [
    { id: 'l1', product_id: 'p1', lot_code: 'LOT-001', expiry_date: dateAfter(12), quantity: 350, reserved: 50, status: 'ok', created_at: dateAfter(-45) },
    { id: 'l2', product_id: 'p1', lot_code: 'LOT-002', expiry_date: dateAfter(120), quantity: 500, reserved: 100, status: 'ok', created_at: dateAfter(-20) },
    { id: 'l3', product_id: 'p2', lot_code: 'LOT-003', expiry_date: dateAfter(25), quantity: 60, reserved: 10, status: 'ok', created_at: dateAfter(-60) },
    { id: 'l4', product_id: 'p3', lot_code: 'LOT-004', expiry_date: dateAfter(-5), quantity: 120, reserved: 0, status: 'ok', created_at: dateAfter(-90) },
    { id: 'l5', product_id: 'p4', lot_code: 'LOT-005', expiry_date: dateAfter(210), quantity: 240, reserved: 40, status: 'ok', created_at: dateAfter(-15) },
    { id: 'l6', product_id: 'p5', lot_code: 'LOT-006', expiry_date: dateAfter(180), quantity: 25, reserved: 0, status: 'damaged', created_at: dateAfter(-30) },
    { id: 'l7', product_id: 'p6', lot_code: 'LOT-007', expiry_date: dateAfter(90), quantity: 75, reserved: 15, status: 'ok', created_at: dateAfter(-10) },
    { id: 'l8', product_id: 'p3', lot_code: 'LOT-008', expiry_date: dateAfter(18), quantity: 90, reserved: 20, status: 'ok', created_at: dateAfter(-25) },
    { id: 'l9', product_id: 'p5', lot_code: 'LOT-009', expiry_date: null, quantity: 100, reserved: 10, status: 'ok', created_at: dateAfter(-7) },
];

export function daysRemaining(expiry: string) {
    const [y, m, d] = expiry.split('-').map(Number);
    const today = new Date();
    return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
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
