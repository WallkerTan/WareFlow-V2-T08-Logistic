import { PreviewForm } from '../../components/workspace/WorkspacePages';
export default function AdminWarehousesNewPage() { return (<PreviewForm title={'Tạo kho hàng'} fields={['Tồn kho', 'Địa chỉ', 'Diện tích kho', 'Sức chứa', 'Người quản lý', 'Mô tả']} back={'/admin/warehouses'}/>); }
