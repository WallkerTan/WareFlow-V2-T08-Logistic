import { ShieldCheck } from 'lucide-react';
import WorkspaceShell from '../../components/workspace/WorkspaceShell';
import { adminLinks } from '../navigation';
export default function AdminLayout() { return <WorkspaceShell config={{ role: 'admin', title: 'Quản trị hệ thống', description: 'Điều hành WareFlow', navLabel: 'QUẢN TRỊ', home: '/admin/dashboard', profile: '/admin/profile', avatar: 'AD', topbarLabel: 'Quản trị hệ thống', icon: ShieldCheck, links: adminLinks }} />; }
