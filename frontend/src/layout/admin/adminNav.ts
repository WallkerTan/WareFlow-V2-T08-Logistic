import {
    Bell,
    Boxes,
    Building2,
    ClipboardList,
    LayoutDashboard,
    Receipt,
    Settings,
    ShieldCheck,
    Truck,
    Users,
    Warehouse,
} from 'lucide-react';

/**
 * Sidebar navigation for the admin system. Kept in its own module so the
 * layout file only exports components (React Fast Refresh friendly).
 */
export const adminNavGroups = [
    {
        label: 'Tổng quan',
        items: [{ to: '/admin', label: 'Bảng điều khiển', icon: LayoutDashboard, end: true }],
    },
    {
        label: 'Tổ chức',
        items: [
            { to: '/admin/companies', label: 'Công ty', icon: Building2 },
            { to: '/admin/users', label: 'Người dùng', icon: Users },
            { to: '/admin/warehouses', label: 'Kho hàng', icon: Warehouse },
            { to: '/admin/suppliers', label: 'Nhà cung cấp', icon: Truck },
        ],
    },
    {
        label: 'Vận hành',
        items: [
            { to: '/admin/products', label: 'Sản phẩm', icon: Boxes },
            { to: '/admin/inventory', label: 'Chứng từ kho', icon: ClipboardList },
            { to: '/admin/shipments', label: 'Vận chuyển', icon: Truck },
            { to: '/admin/finance', label: 'Tài chính', icon: Receipt },
        ],
    },
    {
        label: 'Hệ thống',
        items: [
            { to: '/admin/notifications', label: 'Thông báo', icon: Bell },
            { to: '/admin/logs', label: 'Nhật ký', icon: ShieldCheck },
            { to: '/admin/settings', label: 'Cài đặt', icon: Settings },
        ],
    },
] as const;
