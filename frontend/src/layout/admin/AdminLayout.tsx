import {
    ShieldCheck,
    LayoutDashboard,
    Building2,
    Warehouse,
    Truck,
    Boxes,
    Wallet,
    Users,
    History,
    Bell,
} from "lucide-react";
import WorkspaceShell from "../../components/workspace/WorkspaceShell";
export default function AdminLayout() {
    return (
        <WorkspaceShell
            config={{
                role: "admin",
                title: "Quản trị hệ thống",
                description: "Quản lý kho & logistics",
                navLabel: "KHÔNG GIAN LÀM VIỆC",
                home: "/admin/dashboard",
                profile: "/admin/profile",
                avatar: "AD",
                topbarLabel: "Quản trị hệ thống",
                icon: ShieldCheck,
                links: [
                    {
                        to: "/admin/dashboard",
                        label: "Tổng quan",
                        icon: LayoutDashboard,
                    },
                    {
                        to: "/admin/companies",
                        label: "Quản lý công ty",
                        icon: Building2,
                    },
                    {
                        to: "/admin/warehouses",
                        label: "Quản lý kho",
                        icon: Warehouse,
                    },
                    {
                        to: "/admin/suppliers",
                        label: "Nhà cung cấp",
                        icon: Truck,
                    },
                    {
                        to: "/admin/products",
                        label: "Sản phẩm nhà cung cấp",
                        icon: Boxes,
                    },
                    {
                        to: "/admin/finance",
                        label: "Doanh thu hệ thống",
                        icon: Wallet,
                    },
                    { to: "/admin/users", label: "Nhân viên", icon: Users },
                    {
                        to: "/admin/profile",
                        label: "Hồ sơ WareFlow",
                        icon: ShieldCheck,
                    },
                    {
                        to: "/admin/logs",
                        label: "Nhật ký hệ thống",
                        icon: History,
                    },
                    {
                        to: "/admin/notifications",
                        label: "Thông báo hệ thống",
                        icon: Bell,
                    },
                ],
            }}
        />
    );
}
