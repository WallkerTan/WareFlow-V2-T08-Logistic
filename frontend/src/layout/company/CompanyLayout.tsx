import { Building2 } from 'lucide-react';
import WorkspaceShell from '../../components/workspace/WorkspaceShell';
import { companyLinks } from '../navigation';
export default function CompanyLayout() { return <WorkspaceShell config={{ role: 'company', title: 'Không gian công ty', description: 'Quản lý kho & logistics', navLabel: 'VẬN HÀNH CÔNG TY', home: '/company/dashboard', profile: '/company/profile', avatar: 'CT', topbarLabel: 'Quản trị công ty', icon: Building2, links: companyLinks }} />; }
