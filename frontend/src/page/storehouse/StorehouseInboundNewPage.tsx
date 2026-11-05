import { PreviewForm } from '../../components/workspace/WorkspacePages';
export default function StorehouseInboundNewPage() { return (<PreviewForm title={'Tạo phiếu nhập hàng'} fields={['Nhà cung cấp', 'Sản phẩm', 'Số lượng', 'Đơn giá', 'Ngày nhập', 'Ghi chú']} back={'/storehouse/inbound'}/>); }
