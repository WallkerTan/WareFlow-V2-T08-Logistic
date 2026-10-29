/**
 * Domain types mirroring the WareFlow backend entities.
 * Enum values are kept identical to the Java enums so the UI can be wired
 * to the real API without renaming anything.
 */

export type CompanyStatus = 'PENDING' | 'ACTIVE' | 'LOCKED';
export type CompanyBusinessModel = 'FOOD' | 'TECH' | 'APPLIANCE' | 'FASHION' | 'OTHER';

export type UserRole = 'SYSTEM_ADMIN' | 'COMPANY_ADMIN' | 'WAREHOUSE_MANAGER';
export type UserStatus = 'ACTIVE' | 'LOCKED';

export type WarehouseStatus = 'AVAILABLE' | 'PENDING' | 'ACTIVE' | 'RETURNED';
export type WarehouseType = 'BUY' | 'RENT';

export type ShipmentStatus = 'CREATED' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED' | 'RETURNED';

export type TransactionType = 'INCOME' | 'EXPENSE' | 'SYSTEM_FEE';
export type TransactionCategory = 'SALE' | 'PURCHASE' | 'TRANSFER' | 'FEE' | 'OTHER';

export type StockDocumentStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'DONE' | 'CANCELLED';
export type StockDocumentType =
    | 'PO'
    | 'RECEIPT'
    | 'EXPORT_SALE'
    | 'EXPORT_TRANSFER'
    | 'EXPORT_DESTROY'
    | 'EXPORT_RETURN'
    | 'ADJUST'
    | 'STOCKTAKE';

export type NotificationScope = 'SYSTEM' | 'COMPANY' | 'WAREHOUSE';

export type LotStatus = 'OK' | 'NEAR_EXPIRY' | 'EXPIRED' | 'DAMAGED';

export type Company = {
    id: string;
    name: string;
    businessModel: CompanyBusinessModel;
    status: CompanyStatus;
    taxCode: string;
    email: string;
    phone: string;
    address: string;
    memberCount: number;
    warehouseCount: number;
    createdAt: string;
};

export type AdminUser = {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    companyId: string | null;
    companyName: string;
    phone: string;
    lastActiveAt: string;
    createdAt: string;
};

export type Warehouse = {
    id: string;
    name: string;
    warehouseType: WarehouseType;
    status: WarehouseStatus;
    ownerCompanyId: string;
    ownerCompanyName: string;
    region: string;
    address: string;
    area: number;
    price: number;
    skuCount: number;
    utilization: number;
    createdAt: string;
};

export type Supplier = {
    id: string;
    name: string;
    category: string;
    companyName: string;
    contactPerson: string;
    phone: string;
    email: string;
    productCount: number;
    createdAt: string;
};

export type Product = {
    id: string;
    sku: string;
    barcode: string;
    name: string;
    unit: string;
    warehouseName: string;
    stock: number;
    minStock: number;
    price: number;
    updatedAt: string;
};

export type Shipment = {
    id: string;
    trackingCode: string;
    carrier: string;
    warehouseName: string;
    status: ShipmentStatus;
    codAmount: number;
    customerName: string;
    destination: string;
    createdAt: string;
};

export type Transaction = {
    id: string;
    type: TransactionType;
    category: TransactionCategory;
    amount: number;
    warehouseName: string | null;
    note: string;
    createdAt: string;
};

export type Budget = {
    id: string;
    period: string;
    warehouseName: string | null;
    allocated: number;
    spent: number;
};

export type AdminNotification = {
    id: string;
    scope: NotificationScope;
    type: string;
    title: string;
    body: string;
    isRead: boolean;
    createdAt: string;
};

export type SystemLogEntry = {
    id: string;
    action: string;
    actorName: string;
    companyName: string;
    target: string;
    ipAddress: string;
    createdAt: string;
};

export type StockDocument = {
    id: string;
    code: string;
    type: StockDocumentType;
    status: StockDocumentStatus;
    warehouseName: string;
    partner: string;
    itemCount: number;
    createdAt: string;
};
