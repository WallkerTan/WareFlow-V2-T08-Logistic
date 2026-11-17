import { PreviewForm } from '../../components/workspace/WorkspacePages';
export default function CompanyTransfersNewPage() { return (<PreviewForm title={'Tạo phiếu điều chuyển'} fields={['Kho xuất', 'Kho nhận', 'Sản phẩm', 'Số lượng', 'Ngày điều chuyển', 'Ghi chú']} back={'/company/transfers'}/>); }
