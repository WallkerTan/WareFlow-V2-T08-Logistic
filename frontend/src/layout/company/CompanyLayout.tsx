import { Building2, Warehouse, Store } from 'lucide-react';
import MainLayout from '../main/MainLayout';
import { useSearchParams } from 'react-router-dom';

export default function CompanyLayout() {
    const [params] = useSearchParams();
    const company = params.get('company');
    const suffix = company ? `?company=${encodeURIComponent(company)}` : '';
    return <MainLayout config={{
        role: 'company', title: 'Không gian công ty', description: 'Quản lý kho và thông tin doanh nghiệp',
        navLabel: 'DOANH NGHIỆP', home: '/company/warehouses' + suffix, profile: '/company/profile' + suffix, avatar: 'CT', topbarLabel: 'Company Admin', icon: Building2,
        links: [
            { to: '/company/marketplace' + suffix, label: 'Xem kho đang bán', icon: Store },
            { to: '/company/warehouses' + suffix, label: 'Kho của công ty', icon: Warehouse },
            { to: '/company/profile' + suffix, label: 'Hồ sơ công ty', icon: Building2 },
        ],
    }} />;
}
