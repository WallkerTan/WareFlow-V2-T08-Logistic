import { PreviewForm } from '../../components/workspace/WorkspacePages';
export default function CompanyBudgetNewPage() { return (<PreviewForm title={'Cấp ngân sách cho kho'} fields={['Kho nhận ngân sách', 'Ngân sách', 'Ngày cấp', 'Nội dung', 'Ghi chú']} back={'/company/finance'}/>); }
