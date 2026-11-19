import OperationForm from '../../components/workspace/OperationForm';

export default function CompanyEmployeesNewPage() {
    return (
        <section className="wf-section">
            <div className="admin-page-head">
                <div>
                    <h2>Thêm nhân viên mới</h2>
                    <p>Tạo tài khoản quản lý kho cho nhân viên của công ty.</p>
                </div>
            </div>
            <OperationForm mode="employee" back="/company/employees" />
        </section>
    );
}
