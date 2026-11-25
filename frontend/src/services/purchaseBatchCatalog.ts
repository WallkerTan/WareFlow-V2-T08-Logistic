import { request } from './api';
import { useQuery } from './query';

type BatchCatalog = {
    suppliers: { id: string; name: string }[];
    products: { id: string; supplierId: string; sku: string; legacySku: string | null; name: string; unit: string | null; price: number }[];
};

export function usePurchaseBatchCatalog() {
    return useQuery('purchase-batch-catalog', () => request<BatchCatalog>('core', '/purchase-batches/catalog'));
}
