import { ArrowLeftRight, Bell, Boxes, Building2, ClipboardCheck, History, LayoutDashboard, PackageMinus, PackagePlus, ReceiptText, ShieldCheck, Store, Truck, Users, Wallet, Warehouse, UserRound, TriangleAlert } from 'lucide-react';
import type { WorkspaceConfig } from '../components/workspace/WorkspaceShell';
type Links = WorkspaceConfig['links'];
export const adminLinks: Links = [
    { to: '/admin/dashboard', label: 'Tổng quan', icon: LayoutDashboard }, { to: '/admin/companies', label: 'Công ty', icon: Building2 },
    { to: '/admin/warehouses', label: 'Kho hệ thống', icon: Warehouse }, { to: '/admin/warehouse-transactions', label: 'Duyệt giao dịch kho', icon: ClipboardCheck },
    { to: '/admin/suppliers', label: 'Nhà cung cấp', icon: Truck }, { to: '/admin/products', label: 'Sản phẩm nhà cung cấp', icon: Boxes },
    { to: '/admin/finance', label: 'Tài chính công ty', icon: Wallet }, { to: '/admin/inventory', label: 'Tra cứu hàng hóa', icon: Boxes },
    { to: '/admin/inbound', label: 'Tra cứu / duyệt đơn nhập', icon: PackagePlus }, { to: '/admin/outbound', label: 'Tra cứu / duyệt đơn xuất', icon: PackageMinus },
    { to: '/admin/stocktakes', label: 'Kiểm kê', icon: ClipboardCheck }, { to: '/admin/adjustments', label: 'Điều chỉnh tồn', icon: ReceiptText },
    { to: '/admin/history', label: 'Sổ biến động', icon: History }, { to: '/admin/shipments', label: 'Tra cứu vận đơn', icon: Truck },
    { to: '/admin/logs', label: 'Nhật ký hệ thống', icon: ShieldCheck }, { to: '/admin/notifications', label: 'Thông báo', icon: Bell },
    { to: '/admin/profile', label: 'Hồ sơ WareFlow', icon: UserRound },
];
export const companyLinks: Links = [
    { to: '/company/dashboard', label: 'Tổng quan', icon: LayoutDashboard }, { to: '/company/warehouses', label: 'Kho của công ty', icon: Warehouse },
    { to: '/company/marketplace', label: 'Mua / thuê kho', icon: Store }, { to: '/company/warehouse-transactions', label: 'Giao dịch & bàn giao kho', icon: ClipboardCheck },
    { to: '/company/employees', label: 'Nhân viên quản lý kho', icon: Users }, { to: '/company/inventory', label: 'Hàng hóa các kho', icon: Boxes },
    { to: '/company/alerts', label: 'Cảnh báo tồn kho', icon: TriangleAlert }, { to: '/company/inbound', label: 'Đơn đặt hàng / nhập', icon: PackagePlus },
    { to: '/company/outbound', label: 'Xuất hàng', icon: PackageMinus }, { to: '/company/transfers', label: 'Điều chuyển hàng', icon: ArrowLeftRight },
    { to: '/company/stocktakes', label: 'Kiểm kê', icon: ClipboardCheck }, { to: '/company/adjustments', label: 'Điều chỉnh tồn', icon: ReceiptText },
    { to: '/company/shipments', label: 'Vận đơn & COD', icon: Truck }, { to: '/company/history', label: 'Lịch sử nhập xuất', icon: History },
    { to: '/company/finance', label: 'Ngân sách & thu chi', icon: Wallet }, { to: '/company/approvals', label: 'Trung tâm phê duyệt', icon: ClipboardCheck },
    { to: '/company/suppliers', label: 'Nhà cung cấp', icon: Truck }, { to: '/company/products', label: 'Sản phẩm nhà cung cấp', icon: Boxes },
    { to: '/company/customers', label: 'Khách hàng', icon: Users }, { to: '/company/logs', label: 'Nhật ký công ty', icon: History },
    { to: '/company/notifications', label: 'Thông báo', icon: Bell }, { to: '/company/profile', label: 'Hồ sơ & tài khoản', icon: UserRound },
];
export const storehouseLinks: Links = [
    {to:'/storehouse/dashboard',label:'Tổng quan kho',icon:LayoutDashboard},
    {to:'/storehouse/transfers',label:'Điều chuyển kho',icon:ArrowLeftRight},
    { to: '/storehouse/inventory', label: 'Danh mục hàng hóa', icon: Boxes }, { to: '/storehouse/lots', label: 'Lô & hạn sử dụng', icon: Warehouse },
    { to: '/storehouse/alerts', label: 'Cảnh báo hàng hóa', icon: TriangleAlert }, { to: '/storehouse/inbound', label: 'Đơn đặt hàng', icon: PackagePlus },
    { to: '/storehouse/receipts', label: 'Phiếu nhận hàng', icon: ReceiptText }, { to: '/storehouse/outbound', label: 'Xuất hàng', icon: PackageMinus },
    { to: '/storehouse/stocktakes', label: 'Kiểm kê', icon: ClipboardCheck }, { to: '/storehouse/adjustments', label: 'Điều chỉnh tồn', icon: ReceiptText },
    { to: '/storehouse/shipments', label: 'Giao hàng & COD', icon: Truck }, { to: '/storehouse/history', label: 'Lịch sử nhập xuất', icon: History },
    { to: '/storehouse/finance', label: 'Thu chi & đề nghị chi', icon: Wallet }, { to: '/storehouse/budget', label: 'Ngân sách kho', icon: Wallet },
    { to: '/storehouse/suppliers', label: 'Nhà cung cấp', icon: Truck }, { to: '/storehouse/products', label: 'Sản phẩm nhà cung cấp', icon: Boxes },
    { to: '/storehouse/customers', label: 'Khách hàng', icon: Users }, { to: '/storehouse/notifications', label: 'Thông báo', icon: Bell },
    { to: '/storehouse/profile', label: 'Hồ sơ & tài khoản', icon: UserRound },
];
