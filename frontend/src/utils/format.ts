import type {
    CompanyBusinessModel,
    CompanyStatus,
    ShipmentStatus,
    StockDocumentStatus,
    StockDocumentType,
    TransactionCategory,
    TransactionType,
    UserRole,
    UserStatus,
    WarehouseStatus,
    WarehouseType,
} from '../types/admin';

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('vi-VN');

export function formatCurrency(value: number): string {
    return currencyFormatter.format(value);
}

export function formatNumber(value: number): string {
    return numberFormatter.format(value);
}

/** Compact currency for chart axes and tight cards: 1,2 tỷ / 850 tr. */
export function formatCompactCurrency(value: number): string {
    if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ`;
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;
    return numberFormatter.format(value);
}

export function formatArea(value: number): string {
    return `${numberFormatter.format(value)} m²`;
}

export function formatDate(value: string): string {
    return new Date(value).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

export function formatDateTime(value: string): string {
    return new Date(value).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatRelativeTime(value: string): string {
    const diff = Date.now() - new Date(value).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return 'vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} ngày trước`;
    const months = Math.floor(days / 30);
    return `${months} tháng trước`;
}

export function initials(fullName: string): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[parts.length - 2][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';

export const companyStatusMeta: Record<CompanyStatus, { label: string; tone: BadgeTone }> = {
    ACTIVE: { label: 'Hoạt động', tone: 'success' },
    PENDING: { label: 'Chờ duyệt', tone: 'warning' },
    LOCKED: { label: 'Đã khoá', tone: 'danger' },
};

export const userStatusMeta: Record<UserStatus, { label: string; tone: BadgeTone }> = {
    ACTIVE: { label: 'Hoạt động', tone: 'success' },
    LOCKED: { label: 'Đã khoá', tone: 'danger' },
};

export const userRoleMeta: Record<UserRole, { label: string; tone: BadgeTone }> = {
    SYSTEM_ADMIN: { label: 'Quản trị hệ thống', tone: 'purple' },
    COMPANY_ADMIN: { label: 'Quản trị công ty', tone: 'info' },
    WAREHOUSE_MANAGER: { label: 'Quản lý kho', tone: 'neutral' },
};

export const businessModelMeta: Record<CompanyBusinessModel, { label: string; tone: BadgeTone }> = {
    FOOD: { label: 'Thực phẩm', tone: 'success' },
    TECH: { label: 'Công nghệ', tone: 'info' },
    APPLIANCE: { label: 'Điện gia dụng', tone: 'purple' },
    FASHION: { label: 'Thời trang', tone: 'warning' },
    OTHER: { label: 'Khác', tone: 'neutral' },
};

export const warehouseStatusMeta: Record<WarehouseStatus, { label: string; tone: BadgeTone }> = {
    ACTIVE: { label: 'Đang vận hành', tone: 'success' },
    AVAILABLE: { label: 'Sẵn sàng', tone: 'info' },
    PENDING: { label: 'Chờ duyệt', tone: 'warning' },
    RETURNED: { label: 'Đã trả lại', tone: 'neutral' },
};

export const warehouseTypeMeta: Record<WarehouseType, { label: string; tone: BadgeTone }> = {
    BUY: { label: 'Mua sở hữu', tone: 'purple' },
    RENT: { label: 'Thuê', tone: 'info' },
};

export const shipmentStatusMeta: Record<ShipmentStatus, { label: string; tone: BadgeTone }> = {
    CREATED: { label: 'Đã tạo', tone: 'neutral' },
    IN_TRANSIT: { label: 'Đang vận chuyển', tone: 'info' },
    DELIVERED: { label: 'Đã giao', tone: 'success' },
    FAILED: { label: 'Thất bại', tone: 'danger' },
    RETURNED: { label: 'Hoàn trả', tone: 'warning' },
};

export const transactionTypeMeta: Record<TransactionType, { label: string; tone: BadgeTone }> = {
    INCOME: { label: 'Thu', tone: 'success' },
    EXPENSE: { label: 'Chi', tone: 'danger' },
    SYSTEM_FEE: { label: 'Phí hệ thống', tone: 'info' },
};

export const transactionCategoryMeta: Record<TransactionCategory, { label: string }> = {
    SALE: { label: 'Bán hàng' },
    PURCHASE: { label: 'Nhập hàng' },
    TRANSFER: { label: 'Chuyển kho' },
    FEE: { label: 'Phí' },
    OTHER: { label: 'Khác' },
};

export const stockDocumentStatusMeta: Record<StockDocumentStatus, { label: string; tone: BadgeTone }> = {
    DRAFT: { label: 'Bản nháp', tone: 'neutral' },
    PENDING_APPROVAL: { label: 'Chờ duyệt', tone: 'warning' },
    APPROVED: { label: 'Đã duyệt', tone: 'info' },
    DONE: { label: 'Hoàn tất', tone: 'success' },
    CANCELLED: { label: 'Đã huỷ', tone: 'danger' },
};

export const stockDocumentTypeMeta: Record<StockDocumentType, { label: string }> = {
    PO: { label: 'Đơn mua hàng' },
    RECEIPT: { label: 'Phiếu nhập' },
    EXPORT_SALE: { label: 'Xuất bán hàng' },
    EXPORT_TRANSFER: { label: 'Xuất chuyển kho' },
    EXPORT_DESTROY: { label: 'Xuất hủy' },
    EXPORT_RETURN: { label: 'Xuất hoàn trả' },
    ADJUST: { label: 'Điều chỉnh' },
    STOCKTAKE: { label: 'Kiểm kê' },
};
