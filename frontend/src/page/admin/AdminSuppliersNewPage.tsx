import OperationForm from '../../components/workspace/OperationForm';

export default function AdminSuppliersNewPage() {
    return (
        <section className="wf-section">
            <div className="admin-page-head">
                <div>
                    <h2>Tạo nhà cung cấp</h2>
                    <p>Điền thông tin để thêm nhà cung cấp mới vào hệ thống.</p>
                </div>
            </div>
            <OperationForm mode="supplier" back="/admin/suppliers" />
        </section>
    );
}
