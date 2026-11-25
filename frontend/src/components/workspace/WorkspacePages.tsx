import WalletPanel from './WalletPanel';
import BatchImportPage from './BatchImportPage';
import PurchaseBatches from './PurchaseBatches';
import { useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
    Boxes,
    Warehouse,
    Wallet,
    TrendingUp,
    Search,
    Plus,
    ArrowUpRight,
} from "lucide-react";
import {
    AreaChart,
    Area,
    ResponsiveContainer,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";
import { Card, StatCard, Badge, Modal } from "../admin/AdminUI";
import { useAdminData } from "../../services/data";
import type { Row } from "../../services/api";
import { useWorkspace } from "../../services/workspace";
import {
    cashSeries,
    cashSummary,
    dayKey,
    inPeriod,
    percentage,
} from "../../utils/analytics";
import {
    formatCurrency,
    formatNumber,
    formatCompactCurrency,
} from "../../utils/format";
import OperationForm from "./OperationForm";
import OperationModal from "./OperationModal";

type PageAction = { label: string } & ({ to: string } | { onClick: () => void });

export function Heading({
    title,
    action,
}: {
    title: string;
    action?: PageAction;
}) {
    return (
        <div className="admin-page-head">
            <div>
                <span className="workspace-eyebrow">WAREFLOW / VẬN HÀNH</span>
                <h2>{title}</h2>
                <p>Theo dõi và quản lý tập trung hoạt động của doanh nghiệp.</p>
            </div>
            {action && ('to' in action ? (
                <Link className="adm-btn adm-btn-primary" to={action.to}>
                    <Plus size={16} /> {action.label}
                </Link>
            ) : (
                <button type="button" className="adm-btn adm-btn-primary" onClick={action.onClick}>
                    <Plus size={16} /> {action.label}
                </button>
            ))}
        </div>
    );
}
function Stats() {
    const { products, warehouses, transactions } = useAdminData(
        "products",
        "transactions",
    );
    const now = new Date();
    const sums = cashSummary(
        inPeriod(transactions, Number(dayKey(now).slice(8))),
    );
    return (
        <div className="adm-stats">
            <StatCard
                label="Tổng mã sản phẩm"
                value={formatNumber(products.length)}
                icon={<Boxes size={20} />}
                footnote="Trong các kho được quản lý"
            />
            <StatCard
                label="Kho đang hoạt động"
                value={formatNumber(
                    warehouses.filter((w) => w.status === "ACTIVE").length,
                )}
                icon={<Warehouse size={20} />}
                footnote="Trong mạng lưới công ty"
            />
            <StatCard
                label="Tổng thu tháng này"
                value={formatCompactCurrency(sums.income)}
                icon={<TrendingUp size={20} />}
                tone="success"
            />
            <StatCard
                label="Tổng chi tháng này"
                value={formatCompactCurrency(sums.expense)}
                icon={<Wallet size={20} />}
                tone="warning"
                footnote={`${formatCurrency(sums.net)} chênh lệch thu chi`}
            />
        </div>
    );
}
export function DataPage({
    title,
    columns,
    rows,
    embedded = false,
    action,
    details,
    actions,
    renderCell,
    renderDetail,
}: {
    title: string;
    columns: string[];
    rows: string[][];
    embedded?: boolean;
    action?: PageAction;
    details?: (id: string) => ReactNode;
    actions?: (id: string) => ReactNode;
    renderCell?: (id: string, column: number) => ReactNode;
    renderDetail?: (id: string) => ReactNode;
}) {
    const [query, setQuery] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selected = rows.find((r) => r[0] === selectedId);
    const filtered = rows.filter((r) =>
        r
            .join(" ")
            .toLocaleLowerCase("vi")
            .includes(query.toLocaleLowerCase("vi")),
    );
    return (
        <>
            {!embedded && <Heading title={title} action={action} />}
            <Card title={embedded ? title : undefined}>
                <div className="workspace-toolbar">
                    <label>
                        <Search size={16} />
                        <input
                            aria-label={"Tìm kiếm " + title}
                            placeholder="Tìm kiếm theo mã, tên hoặc nội dung…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </label>
                    <span>{filtered.length} bản ghi</span>
                </div>
                <div className="workspace-table">
                    <table>
                        <thead>
                            <tr>
                                {columns.map((c) => (
                                    <th key={c}>{c}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((r) => (
                                <tr
                                    key={r[0]}
                                    onClick={() => setSelectedId(r[0])}
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && e.target === e.currentTarget)
                                            setSelectedId(r[0]);
                                    }}
                                >
                                    {r.map((v, i) => (
                                        <td key={i}>
                                            {renderCell?.(r[0], i) ?? (i === r.length - 1 ? (
                                                <Badge
                                                    label={v}
                                                    tone={
                                                        /Chờ|Sắp|Khóa/.test(v)
                                                            ? "warning"
                                                            : /Hủy|Lỗi|Từ chối/.test(
                                                                    v,
                                                                )
                                                              ? "danger"
                                                              : "info"
                                                    }
                                                />
                                            ) : (
                                                v
                                            ))}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!filtered.length && (
                        <p className="workspace-empty">
                            Không có bản ghi phù hợp.
                        </p>
                    )}
                </div>
                <div className="workspace-table-footer">
                    <span>
                        Hiển thị {filtered.length} bản ghi · Chọn một dòng để
                        xem chi tiết
                    </span>
                </div>
            </Card>
            {selected && (
                <Modal
                    title={renderDetail ? title : "Chi tiết: " + selected[0]}
                    wide={!!renderDetail}
                    onClose={() => setSelectedId(null)}
                    footer={
                        <div className="wf-operation-actions">
                            {actions?.(selected[0])}
                            <button
                                className="adm-btn"
                                onClick={() => setSelectedId(null)}
                            >
                                Đóng
                            </button>
                        </div>
                    }
                >
                    {renderDetail ? renderDetail(selected[0]) : <div className="adm-form">
                        <div className="wf-fields">
                            {columns.map((c, i) => (
                                <label className="wf-field" key={c}>
                                    <span>{c}</span>
                                    <input
                                        readOnly
                                        value={selected[i] || "—"}
                                    />
                                </label>
                            ))}
                        </div>
                    </div>}
                    {details?.(selected[0])}
                </Modal>
            )}
        </>
    );
}
export function InventoryPage({
    storehouse = false,
}: {
    storehouse?: boolean;
}) {
    const [tab,setTab]=useState<"products"|"batches"|"import">("products");
    const { products, raw } = useAdminData("products");
    const [editing, setEditing] = useState<Row | null>(null);
    return (
        <>
            <Heading
                title={
                    storehouse ? "Hàng hóa trong kho" : "Hàng hóa toàn công ty"
                }
            />
            <div className="workspace-inventory-controls">
                <nav className="workspace-inventory-tabs" aria-label="Danh mục kho">
                    <button type="button" className="adm-btn" aria-pressed={tab === 'products'} onClick={() => setTab('products')}>Sản phẩm</button>
                    <button type="button" className="adm-btn" aria-pressed={tab === 'batches'} onClick={() => setTab('batches')}>Lô hàng</button>
                    <button type="button" className="adm-btn" aria-pressed={tab === 'import'} onClick={() => setTab('import')}>Nhập hàng</button>
                </nav>
                {tab === 'products' && (
                    <button type="button" className="adm-btn adm-btn-primary" onClick={() => setEditing({})}>
                        Thêm sản phẩm
                    </button>
                )}
            </div>
            {tab==='import'?<BatchImportPage/>:tab==='batches'?<PurchaseBatches/>:<>
            <Stats />
            <DataPage
                embedded
                title="Danh sách hàng hóa"
                columns={[
                    "Mã sản phẩm",
                    "Tên sản phẩm",
                    "SKU",
                    "Kho",
                    "Tồn kho",
                    "Tồn tối thiểu",
                    "Trạng thái",
                ]}
                rows={products.map((p) => [
                    p.id,
                    p.name,
                    p.sku,
                    p.warehouseName,
                    formatNumber(p.stock),
                    formatNumber(p.minStock),
                    p.stock < p.minStock ? "Dưới tồn tối thiểu" : "Đủ tồn",
                ])}
                actions={(id) => (
                    <button
                        className="adm-btn"
                        onClick={() =>
                            setEditing(
                                raw.products.find((p) => p.id === id) || {},
                            )
                        }
                    >
                        Chỉnh sửa sản phẩm
                    </button>
                )}
            />
            {editing && (
                <Modal
                    title={editing.id ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm"}
                    onClose={() => setEditing(null)}
                >
                    <OperationForm
                        mode="inventoryProduct"
                        initial={editing}
                        back={
                            storehouse
                                ? "/storehouse/inventory"
                                : "/company/inventory"
                        }
                        onSaved={() => setEditing(null)}
                    />
                </Modal>
            )}
            {storehouse && (
                <div className="workspace-quick">
                    <Link to="/storehouse/lots">
                        Quản lý lô hàng <ArrowUpRight size={16} />
                    </Link>
                    <Link to="/storehouse/outbound/new">
                        Tạo phiếu xuất <ArrowUpRight size={16} />
                    </Link>
                </div>
            )}
        </>}
        </>
    );
}
export function CompanyDashboard() {
    const { warehouses, transactions, raw } = useAdminData("products", "transactions");
    const trend30 = cashSeries(transactions, 30);
    const sums30 = cashSummary(inPeriod(transactions, 30));
    return (
        <>
            <Heading title="Tổng quan công ty" />
            <Stats />
            <div style={{ marginBottom: 20 }}>
                <Card
                    title="Biểu đồ dòng tiền (30 ngày gần nhất)"
                    subtitle={`Tổng thu: ${formatCurrency(sums30.income)} · Tổng chi: ${formatCurrency(sums30.expense)} · Chênh lệch: ${formatCurrency(sums30.net)}`}
                >
                    <div style={{ height: 260, marginTop: 8 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trend30}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip formatter={(v) => formatCurrency(Number(v) * 1e6)} />
                                <Area dataKey="thu" name="Khoản thu" stroke="#318269" fill="#edf7f3" />
                                <Area dataKey="chi" name="Khoản chi" stroke="#e05252" fill="#fdf2f2" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
            <div className="workspace-welcome">
                <div>
                    <Badge label="MẠNG LƯỚI ĐANG HOẠT ĐỘNG" tone="success" />
                    <h2>Mọi kho hàng. Một góc nhìn.</h2>
                    <p>
                        Kiểm soát hàng hóa, ngân sách và tiến độ vận hành trong
                        toàn doanh nghiệp.
                    </p>
                    <Link
                        className="adm-btn adm-btn-primary"
                        to="/company/inventory"
                    >
                        Quản lý hàng hóa <ArrowUpRight size={16} />
                    </Link>
                </div>
                <Warehouse size={110} strokeWidth={1} />
            </div>
            <DataPage
                embedded
                title="Hiệu suất các kho"
                columns={[
                    "Mã kho",
                    "Kho hàng",
                    "Khu vực",
                    "Số lượng tồn",
                    "Số mã hàng",
                    "Trạng thái",
                ]}
                rows={warehouses.map((w) => [
                    w.id,
                    w.name,
                    w.region,
                    formatNumber(
                        raw.products
                            .filter((p) => p.warehouseId === w.id)
                            .reduce((n, p) => n + Number(p.quantity || 0), 0),
                    ),
                    String(
                        raw.products.filter((p) => p.warehouseId === w.id)
                            .length,
                    ),
                    w.status === "ACTIVE" ? "Hoạt động" : w.status,
                ])}
            />
        </>
    );
}
export function FinancePage({ storehouse = false }: { storehouse?: boolean }) {
    const { transactions, budgets, raw } = useAdminData(
        "transactions",
        "budgets",
    );
    const [editing, setEditing] = useState<{
        mode: "transaction" | "budget";
        initial?: Row;
    } | null>(null);
    const { warehouse } = useWorkspace();
    const [range, setRange] = useState("90");
    const rows = inPeriod(transactions, Number(range));
    const trend = cashSeries(transactions, Number(range));
    const sums = cashSummary(rows);
    const strokeColor = storehouse ? "#7955c1" : "#17846b";
    const fillColor = storehouse ? "#f3edfc" : "#eaf6f1";
    return (
        <>
            <Heading
                title={
                    storehouse
                        ? `Thu chi ${String(warehouse?.name || "kho")}`
                        : "Ngân sách & thu chi"
                }
                action={
                    storehouse
                        ? undefined
                        : { onClick: () => setEditing({ mode: "budget" }), label: "Lập ngân sách" }
                }
            />
            <WalletPanel/>
            {!storehouse && <Stats />}
            <div className="workspace-toolbar">
                <button
                    className="adm-btn adm-btn-primary"
                    onClick={() => setEditing({ mode: "transaction" })}
                >
                    {storehouse ? "Ghi nhận khoản thu" : "Ghi nhận thu / chi"}
                </button>
            </div>
            {editing && (
                <OperationModal
                    title={editing.mode === "transaction" ? "Ghi nhận thu chi" : editing.initial ? "Điều chỉnh ngân sách" : "Lập ngân sách"}
                    mode={editing.mode}
                    initial={editing.initial}
                    back={storehouse ? "/storehouse/finance" : "/company/finance"}
                    onClose={() => setEditing(null)}
                />
            )}
            <div className="workspace-toolbar">
                <label>
                    Khoảng thời gian
                    <select
                        className="adm-select"
                        value={range}
                        onChange={(e) => setRange(e.target.value)}
                    >
                        <option value="30">30 ngày</option>
                        <option value="90">90 ngày</option>
                        <option value="365">365 ngày</option>
                    </select>
                </label>
                <span>
                    Thu {formatCurrency(sums.income)} · Chi{" "}
                    {formatCurrency(sums.expense)} · Chênh lệch{" "}
                    {formatCurrency(sums.net)}
                </span>
            </div>
            <div className="workspace-columns">
                <Card
                    title="Biến động thu chi"
                    subtitle={`Đơn vị: triệu đồng · ${range} ngày gần nhất`}
                >
                    <div style={{ height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trend}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip
                                    formatter={(v) =>
                                        formatCurrency(Number(v) * 1e6)
                                    }
                                />
                                <Area
                                    dataKey="thu"
                                    name="Khoản thu"
                                    stroke={strokeColor}
                                    fill={fillColor}
                                />
                                <Area
                                    dataKey="chi"
                                    name="Khoản chi (gồm phí)"
                                    stroke="#e05252"
                                    fill="#fdf2f2"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    {!rows.length && (
                        <p className="workspace-empty">
                            Chưa phát sinh thu chi trong kỳ này.
                        </p>
                    )}
                </Card>
                <Card
                    title={
                        storehouse ? "Ngân sách của kho" : "Phân bổ ngân sách"
                    }
                    subtitle="Kỳ ngân sách tháng hiện tại"
                >
                    <div className="workspace-budgets">
                        {budgets.map((b) => (
                            <div key={b.id}>
                                <strong>
                                    {b.warehouseName || "Toàn công ty"}
                                </strong>
                                <span>
                                    Đã dùng {formatCurrency(b.spent)} /{" "}
                                    {formatCurrency(b.allocated)}
                                </span>
                                <progress
                                    value={Math.min(
                                        100,
                                        Math.max(
                                            0,
                                            percentage(b.spent, b.allocated) ||
                                                0,
                                        ),
                                    )}
                                    max="100"
                                />
                                {!storehouse && (
                                    <button
                                        className="adm-btn"
                                        onClick={() =>
                                            setEditing({
                                                mode: "budget",
                                                initial: raw.budgets.find(
                                                    (r) => r.id === b.id,
                                                ),
                                            })
                                        }
                                    >
                                        Điều chỉnh
                                    </button>
                                )}
                                {b.spent > b.allocated && (
                                    <small>
                                        Vượt ngân sách:{" "}
                                        {formatCurrency(b.spent - b.allocated)}
                                    </small>
                                )}
                            </div>
                        ))}
                        {!budgets.length && (
                            <p className="workspace-empty">
                                Chưa cấp ngân sách trong tháng này.
                            </p>
                        )}
                    </div>
                </Card>
            </div>
            <DataPage
                embedded
                title="Giao dịch trong kỳ"
                columns={["Mã giao dịch", "Nội dung", "Kho", "Số tiền", "Loại"]}
                rows={rows.map((t) => [
                    t.id,
                    t.note,
                    t.warehouseName || "Toàn công ty",
                    formatCurrency(t.amount),
                    t.type === "INCOME"
                        ? "Thu"
                        : t.type === "SYSTEM_FEE"
                          ? "Phí hệ thống"
                          : "Chi",
                ])}
            />
        </>
    );
}
export function PreviewForm({
    title,
    back,
}: {
    title: string;
    fields: string[];
    back: string;
}) {
    return (
        <>
            <Heading title={title} />
            <OperationForm back={back} />
        </>
    );
}
