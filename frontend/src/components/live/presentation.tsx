import { date, money, object, text } from '../../services/api';
import type { Row } from '../../services/api';
export const labels: Record<string, string> = {
    ACTIVE: 'Hoạt động', PENDING: 'Chờ duyệt', LOCKED: 'Đã khóa', DELETED: 'Đã xóa', ARCHIVED: 'Đã lưu trữ',
    AVAILABLE: 'Đang giao dịch', RETURNED: 'Đã trả / hoàn hàng', BUY: 'Mua', RENT: 'Thuê', RETURN: 'Trả kho',
    NEGOTIATING: 'Đang thương lượng', COMPLETED: 'Hoàn tất', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối',
    DRAFT: 'Bản nháp', PENDING_APPROVAL: 'Chờ phê duyệt', DONE: 'Hoàn tất', CANCELLED: 'Đã hủy',
    FOOD: 'Thực phẩm', TECH: 'Công nghệ', APPLIANCE: 'Gia dụng', FASHION: 'Thời trang', OTHER: 'Khác',
    SYSTEM_ADMIN: 'Quản trị hệ thống', COMPANY_ADMIN: 'Quản trị công ty', WAREHOUSE_MANAGER: 'Quản lý kho',
    INCOME: 'Thu', EXPENSE: 'Chi', SYSTEM_FEE: 'Phí hệ thống', SALE: 'Bán hàng', PURCHASE: 'Mua hàng', FEE: 'Phí', TRANSFER: 'Điều chuyển',
    OK: 'Bình thường', DAMAGED: 'Hư hỏng', NEAR_EXPIRY: 'Sắp hết hạn', EXPIRED: 'Hết hạn', LOW_STOCK: 'Dưới tồn tối thiểu',
    PO: 'Đơn đặt hàng', RECEIPT: 'Phiếu nhập', STOCKTAKE: 'Kiểm kê', ADJUST: 'Điều chỉnh',
    EXPORT_SALE: 'Xuất bán', EXPORT_TRANSFER: 'Điều chuyển', EXPORT_DESTROY: 'Xuất hủy', EXPORT_RETURN: 'Trả nhà cung cấp',
    CREATED: 'Mới tạo', IN_TRANSIT: 'Đang giao', DELIVERED: 'Đã giao', FAILED: 'Giao thất bại', COLLECTED: 'Đã thu COD', NOT_REQUIRED: 'Không thu COD',
};
export const models = ['FOOD', 'TECH', 'APPLIANCE', 'FASHION', 'OTHER'].map(value => ({ value, label: labels[value] }));
export function status(value: unknown) { const v = text(value); return <span className={`live-badge live-status-${v.toLowerCase()}`}>{labels[v] || v}</span>; }
export function valueAt(row: Row, path: string): unknown { return path.split('.').reduce<unknown>((value, key) => object(value)[key], row); }
export const commonColumns = {
    name: { key: 'name', label: 'Tên' }, status: { key: 'status', label: 'Trạng thái', render: (r: Row) => status(r.status) },
    created: { key: 'createdAt', label: 'Ngày tạo', render: (r: Row) => date(r.createdAt) },
    amount: { key: 'amount', label: 'Số tiền', render: (r: Row) => money(r.amount) },
};
