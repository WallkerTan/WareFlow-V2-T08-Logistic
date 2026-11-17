import { PreviewForm } from '../../components/workspace/WorkspacePages';
export default function StorehouseShipmentsNewPage() { return (<PreviewForm title={'Tạo vận đơn'} fields={['Phiếu xuất kho', 'Người nhận', 'Số điện thoại', 'Địa chỉ giao', 'Đơn vị vận chuyển', 'Ngày giao', 'Ghi chú']} back={'/storehouse/shipments'}/>); }
