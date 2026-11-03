import { ShieldCheck, Warehouse } from 'lucide-react';
import MainLayout from '../main/MainLayout';

export default function AdminLayout() {
    return <MainLayout config={{
        role: 'admin', title: 'Quản trị hệ thống', description: 'Quản lý toàn bộ mạng lưới WareFlow',
        navLabel: 'HỆ THỐNG', home: '/wareflow/warehouses', profile: '/wareflow/profile', avatar: 'AD', topbarLabel: 'System Admin', icon: ShieldCheck,
        links: [
            { to: '/wareflow/warehouses', label: 'Quản lý kho hệ thống', icon: Warehouse },
            { to: '/wareflow/profile', label: 'Hồ sơ WareFlow', icon: ShieldCheck },
        ],
    }} />;
}
