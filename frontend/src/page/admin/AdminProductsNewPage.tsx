import OperationForm from '../../components/workspace/OperationForm';

export default function AdminProductsNewPage() {
    return (
        <section className="wf-section">
            <div className="admin-page-head">
                <div>
                    <h2>Thêm sản phẩm cho nhà cung cấp</h2>
                    <p>Điền thông tin sản phẩm để liên kết với nhà cung cấp.</p>
                </div>
            </div>
            <OperationForm mode="supplierProduct" back="/admin/products" />
        </section>
    );
}
