import { cashSummary, inPeriod } from '../../utils/analytics';
import { Link, useParams } from "react-router-dom";
import { Building2, Users, Wallet, Warehouse } from "lucide-react";
import { StatCard } from "../../components/admin/AdminUI";
import { DataPage, Heading } from "../../components/workspace/WorkspacePages";
import { useAdminData } from '../../services/data';
import { formatCurrency, formatDate } from "../../utils/format";

export default function AdminCompanyDetailPage() {
    const { companies, warehouses, transactions, raw } = useAdminData('transactions', 'products');
    const { companyId } = useParams();
    const company = companies.find((item) => item.id === companyId);
    if (!company)
        return (
            <>
                <Heading title="Không tìm thấy công ty" />
                <Link to="/admin/companies">Quay lại danh sách</Link>
            </>
        );
    const depots = warehouses.filter(
        (item) => item.ownerCompanyId === company.id,
    );
    const ids = new Set(raw.transactions.filter(t=>t.companyId===company.id).map(t=>t.id));
    const payments = inPeriod(transactions.filter(t=>ids.has(t.id)),365);
    const revenue = cashSummary(payments).income;
    return (
        <>
            <Heading title={company.name} />
            <div className="adm-stats">
                <StatCard
                    label="Kho của công ty"
                    value={String(depots.length)}
                    icon={<Warehouse size={20} />}
                />
                <StatCard
                    label="Nhân viên công ty"
                    value="—" footnote="Quản lý tại không gian công ty"
                    icon={<Users size={20} />}
                />
                <StatCard
                    label="Thu trong 365 ngày"
                    value={formatCurrency(revenue)}
                    icon={<Wallet size={20} />}
                    tone="success"
                />
                <StatCard
                    label="Giao dịch"
                    value={String(payments.length)}
                    icon={<Building2 size={20} />}
                />
            </div>
            <div className="workspace-detail-stack">
                <DataPage
                    embedded
                    title="Các kho thuộc công ty"
                    columns={[
                        "Mã kho",
                        "Tên kho",
                        "Khu vực",
                        "Sản phẩm",
                        "Trạng thái",
                    ]}
                    rows={depots.map((item) => [
                        item.id,
                        item.name,
                        item.region,
                        String(item.skuCount),
                        item.status === "ACTIVE" ? "Hoạt động" : "Chờ xử lý",
                    ])}
                />
                <DataPage
                    embedded
                    title="Giao dịch & doanh thu"
                    columns={[
                        "Mã giao dịch",
                        "Kho",
                        "Nội dung",
                        "Số tiền",
                        "Ngày tạo",
                        "Trạng thái",
                    ]}
                    rows={payments.map((item) => [
                        item.id,
                        item.warehouseName || "—",
                        item.note,
                        formatCurrency(item.amount),
                        formatDate(item.createdAt),
                        "Hoàn tất",
                    ])}
                />
                <section className="wf-card"><h3>Nhân viên công ty</h3><p>Danh sách và quyền nhân viên được quản lý trong tài khoản quản trị của công ty.</p></section>
            </div>
        </>
    );
}
