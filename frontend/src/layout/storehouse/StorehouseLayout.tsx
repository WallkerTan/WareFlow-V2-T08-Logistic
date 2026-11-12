import { Warehouse } from 'lucide-react';
import WorkspaceShell from '../../components/workspace/WorkspaceShell';
import { storehouseLinks } from '../navigation';
export default function StorehouseLayout() { return <WorkspaceShell config={{ role: 'storehouse', title: 'Không gian kho', description: 'Quản lý hàng hóa & giao nhận', navLabel: 'VẬN HÀNH KHO', home: '/storehouse/inventory', profile: '/storehouse/profile', avatar: 'QL', topbarLabel: 'Quản lý kho', icon: Warehouse, links: storehouseLinks }} />; }
