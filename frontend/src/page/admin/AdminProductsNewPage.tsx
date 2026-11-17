import { PreviewForm } from '../../components/workspace/WorkspacePages';
export default function AdminProductsNewPage() { return (<PreviewForm title={'Thêm sản phẩm cho nhà cung cấp'} fields={['Nhà cung cấp', 'Mã sản phẩm', 'Tên sản phẩm', 'Danh mục', 'Đơn vị tính', 'Đơn giá', 'Mô tả']} back={'/admin/products'}/>); }
