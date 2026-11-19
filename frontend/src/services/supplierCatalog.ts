import { allPages, ApiError, mutate, number } from './api';
import type { Row } from './api';

export function inventoryFields(product: Row) {
    return { sku: String(product.sku), name: String(product.name), unit: String(product.unit || ''),
        barcode: product.barcode || null, minStock: 0, images: product.image ? [String(product.image)] : [] };
}

/** Resolve supplier catalogue IDs to warehouse IDs before submitting a purchase order. */
export async function purchaseOrderLines(warehouseId: string, catalog: Row[], inventory: Row[], lines: { productId: string; qty: string; price: string }[]) {
    const selected = lines.map(line => {
        const product = catalog.find(p => p.id === line.productId);
        if (!product) throw new Error('Sản phẩm không còn thuộc nhà cung cấp đã chọn. Vui lòng chọn lại.');
        if (!Number.isFinite(Number(line.price)) || Number(line.price) < 0 || !Number.isFinite(Number(line.qty)) || Number(line.qty) <= 0)
            throw new Error('Số lượng và đơn giá chưa hợp lệ.');
        return { line, product };
    });
    let available = inventory.filter(p => p.warehouseId === warehouseId);
    const result = [];
    for (const { line, product } of selected) {
        const matches = (p: Row) => String(p.sku).trim().toLowerCase() === String(product.sku).trim().toLowerCase();
        let existing = available.find(matches);
        if (!existing) {
            try { existing = await mutate<Row>('inventory', `/warehouses/${warehouseId}/products`, 'POST', inventoryFields(product)); }
            catch (error) {
                // Another tab may have just registered this SKU in the same warehouse.
                if (!(error instanceof ApiError) || error.status !== 409) throw error;
                available = await allPages<Row>('inventory', `/warehouses/${warehouseId}/products`);
                existing = available.find(matches);
                if (!existing) throw error;
            }
            available.push(existing);
        }
        result.push({ productId: String(existing.id), qty: number(line.qty), price: number(line.price) });
    }
    return result;
}
