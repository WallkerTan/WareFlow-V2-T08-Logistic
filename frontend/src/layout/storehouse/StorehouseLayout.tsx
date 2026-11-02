import { Warehouse } from 'lucide-react';
import MainLayout from '../main/MainLayout';

export default function StorehouseLayout() {
    return <MainLayout config={{
        role: 'storehouse', title: 'Không gian kho', description: 'Thông tin và hồ sơ kho phụ trách',
        navLabel: 'QUẢN LÝ KHO', home: '/storehouse/profile', profile: '/storehouse/profile', avatar: 'QL', topbarLabel: 'Warehouse Manager', icon: Warehouse,
        links: [{ to: '/storehouse/profile', label: 'Hồ sơ kho', icon: Warehouse }],
    }} />;
}
