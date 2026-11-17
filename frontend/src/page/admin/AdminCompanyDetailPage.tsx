import { Link, useParams } from "react-router-dom";
import { Building2, Users, Wallet, Warehouse } from "lucide-react";
import { StatCard } from "../../components/admin/AdminUI";
import { DataPage, Heading } from "../../components/workspace/WorkspacePages";
import {
    companies,
    warehouses,
    transactions,
    users,
} from "../../data/adminData";
import { formatCurrency, formatDate } from "../../utils/format";

export default function AdminCompanyDetailPage() {
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
    const members = users.filter((item) => item.companyId === company.id);
    const payments = transactions.filter((item) =>
        depots.some((depot) => depot.name === item.warehouseName),
    );
    const revenue = payments
        .filter((item) => item.type === "INCOME")
        .reduce((sum, item) => sum + item.amount, 0);
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
                    label="Nhân viên trong danh sách"
                    value={String(members.length)}
                    icon={<Users size={20} />}
                />
                <StatCard
                    label="Doanh thu ghi nhận"
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
                <DataPage
                    embedded
                    title="Nhân viên công ty"
                    columns={[
                        "Mã nhân viên",
                        "Họ tên",
                        "Email",
                        "Vai trò",
                        "Trạng thái",
                    ]}
                    rows={members.map((item) => [
                        item.id,
                        item.fullName,
                        item.email,
                        item.role,
                        item.status === "ACTIVE" ? "Hoạt động" : "Chờ xử lý",
                    ])}
                />
            </div>
        </>
    );
}
