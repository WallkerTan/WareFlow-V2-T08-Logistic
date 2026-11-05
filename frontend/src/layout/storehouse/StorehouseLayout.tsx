import { Boxes, Warehouse } from 'lucide-react';
import MainLayout from '../main/MainLayout';

export default function StorehouseLayout() {
    return <MainLayout config={{
        role: 'storehouse', title: 'Không gian kho', description: 'Quản lý tồn kho và hồ sơ kho phụ trách',
        navLabel: 'QUẢN LÝ KHO', home: '/storehouse/lots', profile: '/storehouse/profile', avatar: 'QL', topbarLabel: 'Warehouse Manager', icon: Warehouse,
        links: [{ to: '/storehouse/lots', label: 'Quản lí hàng hóa của kho', icon: Boxes }, { to: '/storehouse/profile', label: 'Hồ sơ kho', icon: Warehouse }],
    }} />;
}
