import toast from 'react-hot-toast';
import { useMemo } from 'react';
import { allPages, mutate, number, object, query, request } from './api';
import type { Row, Service } from './api';
import { getAuthSession } from './authApi';
import { invalidateData, useQuery } from './query';
import { useWorkspace } from './workspace';
import { dayKey } from '../utils/analytics';
import type { AdminNotification, AdminUser, Budget, Company, Product, Shipment, StockDocument, Supplier, SystemLogEntry, Transaction, Warehouse } from '../types/admin';

const str = (v: unknown) => v == null ? '' : String(v);
export async function mapLimit<T, R>(items: T[], fn: (item: T) => Promise<R>, limit = 4): Promise<R[]> {
    const results: R[] = new Array(items.length); let index = 0;
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => { while (index < items.length) { const i = index++; results[i] = await fn(items[i]); } }));
    return results;
}
export type DataKey = 'users' | 'suppliers' | 'supplierProducts' | 'products' | 'transactions' | 'budgets' | 'notifications' | 'systemLogs' | 'shipments' | 'stockDocuments' | 'expenses' | 'lots' | 'movements' | 'warehouseTransactions';
const EMPTY: Row[] = [];
export function useAdminData(...wanted: DataKey[]) {
    const session = getAuthSession()!;
    const scope = useWorkspace();
    const isAdmin = session?.role === 'SYSTEM_ADMIN';
    const isManager = session?.role === 'WAREHOUSE_MANAGER';
    const companiesQuery = useQuery<Row[]>('companies', () => isAdmin ? allPages('core', '/companies') : isManager
        ? Promise.resolve(session?.companyId ? [{ id: session.companyId, name: session.companyName }] : [])
        : request<Row>('core', '/companies/my-company').then(r => [r]));
    const companyRows = companiesQuery.data || EMPTY;
    const warehouseRows = scope.warehouses;
    const workingWarehouses = isManager ? warehouseRows.filter(w => w.id === scope.warehouseId) : warehouseRows;
    const companiesIds = isAdmin ? companyRows.map(c => str(c.id)) : [session?.companyId].filter(Boolean) as string[];
    const scopeKey = `${companiesIds.join(',')}:${workingWarehouses.map(w => w.id).join(',')}`;
    const ready = !scope.loading && !companiesQuery.loading && (!companiesQuery.error || companiesQuery.data !== undefined);
    async function acrossWarehouses(service: Service, collection: string): Promise<Row[]> {
        return (await mapLimit(workingWarehouses, async w => (await allPages<Row>(service, `/warehouses/${w.id}/${collection}`)).map(r => ({ ...r, warehouseId: w.id, warehouseName: w.name })))).flat();
    }
    async function finance(collection: string) {
        const today = dayKey(new Date()); const year = Number(today.slice(0, 4));
        // Two comparison windows (up to 365 days each) may cross three calendar years.
        const periods = collection === 'transactions' ? [year - 2, year - 1, year].map(String) : [collection === 'budgets' ? today.slice(0, 7) : ''];
        const jobs = companiesIds.flatMap(companyId => periods.map(period => ({ companyId, period })));
        return (await mapLimit(jobs, async j => (await allPages<Row>('finance', `/${collection}${query({ companyId: isAdmin ? j.companyId : undefined, period: j.period, warehouseId: isManager ? scope.warehouseId : undefined })}`)).map(r => ({ ...r, companyId: j.companyId })))).flat();
    }
    function resource(key: DataKey, loader: () => Promise<Row[]>) {
        // Hooks run in a fixed order; only the requests needed by this view are enabled.
        // eslint-disable-next-line react-hooks/rules-of-hooks
        return useQuery<Row[]>(ready && wanted.includes(key) && (!isManager || !!scope.warehouseId || ['users','notifications','suppliers','supplierProducts'].includes(key)) ? `data:${key}:${scopeKey}` : null, loader);
    }
    const usersQuery = resource('users', () => isAdmin ? allPages('core', '/users') : isManager ? request<Row>('core', '/users/me').then(r => [r]) : allPages('core', '/employees'));
    const suppliersQuery = resource('suppliers', () => allPages('core', '/suppliers'));
    const supplierProductsQuery = resource('supplierProducts', async () => {
        const suppliers = await allPages<Row>('core', '/suppliers');
        return (await mapLimit(suppliers, async s => (await allPages<Row>('core', `/suppliers/${s.id}/products`)).map(p => ({ ...p, supplierId: s.id, supplierName: s.name })))).flat();
    });
    const productsQuery = resource('products', () => acrossWarehouses('inventory', 'products'));
    const transactionsQuery = resource('transactions', () => finance('transactions'));
    const budgetsQuery = resource('budgets', () => finance('budgets'));
    const notificationsQuery = resource('notifications', () => allPages('core', '/notifications'));
    const logsQuery = resource('systemLogs', () => allPages('core', isAdmin ? '/system-logs' : '/system-logs/my-company'));
    const shipmentsQuery = resource('shipments', async () => {
        const [legacy,operations] = await Promise.all([acrossWarehouses('delivery','shipments'),acrossWarehouses('inventory','trade/operations')]);
        return [...legacy,...operations.filter(op=>op.kind==='SALE').map(op=>({...op,tradeOperation:true,trackingCode:op.id,carrier:'WareFlow',codAmount:op.amount,customerName:object(op.details).recipientName,destination:object(op.details).recipientAddress,status:op.status==='DONE'?'DELIVERED':op.status==='READY'?'CREATED':'IN_TRANSIT',codStatus:op.status==='DONE'?'COLLECTED':'PENDING'}))];
    });
    const documentsQuery = resource('stockDocuments', async () => (await Promise.all(['purchase-orders', 'receipts', 'exports'].map(c => acrossWarehouses('inventory', c)))).flat());
    const expensesQuery = resource('expenses', () => finance('expense-requests'));
    const lotsQuery = resource('lots', async () => {
        const products = await acrossWarehouses('inventory', 'products');
        return (await mapLimit(products, async p => (await allPages<Row>('inventory', `/warehouses/${p.warehouseId}/products/${p.id}/lots`)).map(lot => ({ ...lot, warehouseId: p.warehouseId, productId: p.id })))).flat();
    });
    const movementsQuery = resource('movements', () => acrossWarehouses('inventory', 'movements'));
    const proposalsQuery = resource('warehouseTransactions', () => allPages('core', '/warehouse-transactions'));
    const raw = useMemo(() => ({ users: usersQuery.data || EMPTY, suppliers: suppliersQuery.data || EMPTY, supplierProducts: supplierProductsQuery.data || EMPTY, products: productsQuery.data || EMPTY, transactions: transactionsQuery.data || EMPTY, budgets: budgetsQuery.data || EMPTY, notifications: notificationsQuery.data || EMPTY, systemLogs: logsQuery.data || EMPTY, shipments: shipmentsQuery.data || EMPTY, stockDocuments: documentsQuery.data || EMPTY, expenses: expensesQuery.data || EMPTY, lots: lotsQuery.data || EMPTY, movements: movementsQuery.data || EMPTY, warehouseTransactions: proposalsQuery.data || EMPTY, companies: companyRows, warehouses: warehouseRows }), [usersQuery.data, suppliersQuery.data, supplierProductsQuery.data, productsQuery.data, transactionsQuery.data, budgetsQuery.data, notificationsQuery.data, logsQuery.data, shipmentsQuery.data, documentsQuery.data, expensesQuery.data, lotsQuery.data, movementsQuery.data, proposalsQuery.data, companyRows, warehouseRows]);
    return useMemo(() => {
    const companyName = (id: unknown) => str(companyRows.find(c => c.id === id)?.name);
    const warehouseName = (id: unknown) => str(warehouseRows.find(w => w.id === id)?.name);
    const companies: Company[] = companyRows.filter(r => r.status !== 'DELETED').map(r => ({ ...r, id: str(r.id), name: str(r.name), businessModel: r.businessModel as Company['businessModel'], status: r.status as Company['status'], taxCode: str(object(r.profile).taxCode), email: str(object(r.profile).email), phone: str(object(r.profile).phone), address: str(object(r.profile).address), memberCount: number(r.memberCount), warehouseCount: warehouseRows.filter(w => w.ownerCompanyId === r.id).length, createdAt: str(r.createdAt) }));
    const warehouses: Warehouse[] = warehouseRows.filter(w => w.status !== 'ARCHIVED').map(w => ({ ...w, id: str(w.id), name: str(w.name), ownerCompanyId: str(w.ownerCompanyId), ownerCompanyName: str(w.ownerCompanyName), warehouseType: w.warehouseType as Warehouse['warehouseType'], status: w.status as Warehouse['status'], region: str(w.region), address: str(w.address), area: number(w.area), price: number(w.price), skuCount: raw.products.filter(p => p.warehouseId === w.id).length, utilization: number(object(w.profile).utilization), createdAt: str(w.createdAt) }));
    const users: AdminUser[] = raw.users.map(r => ({ ...r, id: str(r.id), fullName: str(r.fullName), email: str(r.email), companyId: r.companyId ? str(r.companyId) : null, companyName: companyName(r.companyId), phone: str(object(r.profile).phone), role: r.role as AdminUser['role'], status: r.status as AdminUser['status'], lastActiveAt: str(r.lastActiveAt), createdAt: str(r.createdAt) }));
    const suppliers: Supplier[] = raw.suppliers.map(r => ({ ...r, id: str(r.id), name: str(r.name), category: str(r.businessModel), companyName: companyName(r.companyId), contactPerson: str(r.contactPerson), phone: str(r.phone), email: str(r.email), productCount: raw.supplierProducts.filter(p => p.supplierId === r.id).length, createdAt: str(r.createdAt) }));
    const products: Product[] = raw.products.map(r => ({ ...r, id: str(r.id), sku: str(r.sku), barcode: str(r.barcode), name: str(r.name), unit: str(r.unit), warehouseName: warehouseName(r.warehouseId), stock: number(r.quantity), minStock: number(r.minStock), price: number(r.price), updatedAt: str(r.updatedAt || r.createdAt) }));
    const supplierProducts: Product[] = raw.supplierProducts.map(r => ({ ...r, id: str(r.id), sku: str(r.sku), barcode: str(r.barcode), name: str(r.name), unit: str(r.unit), warehouseName: str(r.supplierName), stock: 0, minStock: 0, price: number(r.price), updatedAt: str(r.updatedAt) }));
    const transactions: Transaction[] = raw.transactions.map(r => ({ ...r, id: str(r.id), type: r.type as Transaction['type'], category: r.category as Transaction['category'], amount: number(r.amount), warehouseName: r.warehouseId ? warehouseName(r.warehouseId) : null, note: str(r.note), createdAt: str(r.createdAt) }));
    const budgets: Budget[] = raw.budgets.map(r => ({ ...r, id: str(r.id), period: str(r.period), warehouseName: r.warehouseId ? warehouseName(r.warehouseId) : null, allocated: number(r.allocated), spent: number(r.spent) }));
    const notifications: AdminNotification[] = raw.notifications.map(r => ({ ...r, id: str(r.id), scope: r.scope as AdminNotification['scope'], type: str(r.type), title: str(r.title), body: str(object(r.payload).message || object(r.payload).description || object(r.payload).reason), isRead: Boolean(r.isRead), createdAt: str(r.createdAt) }));
    const systemLogs: SystemLogEntry[] = raw.systemLogs.map(r => ({ ...r, id: str(r.id), action: str(r.action), actorName: str(r.actorName), companyName: str(r.companyName), target: str(object(r.metadata).description || object(r.target).targetType), ipAddress: str(object(r.metadata).clientIp), createdAt: str(r.createdAt) }));
    const shipments: Shipment[] = raw.shipments.map(r => ({ ...r, id: str(r.id), trackingCode: str(r.trackingCode), carrier: str(r.carrier), warehouseName: warehouseName(r.warehouseId), status: r.status as Shipment['status'], codAmount: number(r.codAmount), customerName: str(r.customerName), destination: str(r.destination), createdAt: str(r.createdAt) }));
    const stockDocuments: StockDocument[] = raw.stockDocuments.map(r => ({ ...r, id: str(r.id), code: str(r.code || r.id), type: r.type as StockDocument['type'], status: r.status as StockDocument['status'], warehouseName: warehouseName(r.warehouseId), partner: str(object(r.approval).supplierName), itemCount: Array.isArray(r.lines) ? r.lines.length : 0, createdAt: str(r.createdAt) }));
    return { companies, warehouses, users, suppliers, products, supplierProducts, transactions, budgets, notifications, systemLogs, shipments, stockDocuments, raw };
    }, [raw, companyRows, warehouseRows]);
}
export async function saveResource(service: Service, path: string, method: string, body?: unknown) {
    const result = await mutate(service, path, method, body); invalidateData(); return result;
}

export async function attempt(action: () => Promise<unknown>): Promise<boolean> { try { await action(); return true; } catch (error) { toast.error(error instanceof Error ? error.message : 'Không lưu được dữ liệu.'); return false; } }
