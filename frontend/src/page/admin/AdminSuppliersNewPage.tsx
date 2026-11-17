import { PreviewForm } from '../../components/workspace/WorkspacePages';
export default function AdminSuppliersNewPage() { return (<PreviewForm title={'Tạo nhà cung cấp'} fields={['Tên nhà cung cấp', 'Mã số thuế', 'Email', 'Số điện thoại', 'Địa chỉ', 'Ghi chú']} back={'/admin/suppliers'}/>); }
