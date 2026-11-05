import { PreviewForm } from '../../components/workspace/WorkspacePages';
export default function StorehouseOutboundNewPage() { return (<PreviewForm title={'Tạo phiếu xuất hàng'} fields={['Đơn vị nhận', 'Sản phẩm', 'Số lượng', 'Ngày xuất', 'Địa chỉ giao', 'Ghi chú']} back={'/storehouse/outbound'}/>); }
