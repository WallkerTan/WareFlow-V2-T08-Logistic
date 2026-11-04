import { PreviewForm } from '../../components/workspace/WorkspacePages';
export default function CompanyEmployeesNewPage() { return (<PreviewForm title={'Thêm nhân viên'} fields={['Họ tên', 'Email', 'Số điện thoại', 'Vai trò', 'Kho phụ trách']} back={'/company/employees'}/>); }
