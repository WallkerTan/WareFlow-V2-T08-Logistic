import WalletPanel from '../../components/workspace/WalletPanel';
import { downloadCsv } from "../../utils/export";
import {
    percentage,
    cashSeries, dayKey,
    cashSummary,
    inPeriod,
    growth,
    percentLabel,
} from "../../utils/analytics";
import { useState } from "react";
import {
    ArrowDownRight,
    ArrowUpRight,
    Check,
    Download,
    Info,
    Receipt,
    Search,
    ShieldCheck,
    Wallet,
} from "lucide-react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import {
    Badge,
    Card,
    EmptyState,
    Modal,
    Pagination,
    Progress,
} from "../../components/admin/AdminUI";
import { useAdminData } from "../../services/data";
import type { Transaction, TransactionType } from "../../types/admin";
import {
    formatCompactCurrency,
    formatCurrency,
    formatDateTime,
    transactionCategoryMeta,
    transactionTypeMeta,
} from "../../utils/format";

const PAGE_SIZE = 6;

export default function AdminFinance() {
    const { budgets,companies,warehouses,transactions: allTransactions } = useAdminData(
        "budgets",
        "transactions",
    );
    const [range, setRange] = useState("90");
    const [company,setCompany]=useState('');
    const [warehouse,setWarehouse]=useState('');
    const [category,setCategory]=useState('');
    const [bucket,setBucket]=useState('');
    const seedTransactions=allTransactions.filter(t=>(!company||t.companyId===company)&&(!warehouse||t.warehouseId===warehouse)&&(!category||t.category===category));
    const rows = inPeriod(seedTransactions, Number(range));
    const cashflow = cashSeries(seedTransactions, Number(range));
    const sums = cashSummary(rows);
    const previous = cashSummary(
        inPeriod(seedTransactions, Number(range), new Date(), true),
    );
    const [query, setQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<"ALL" | TransactionType>(
        "ALL",
    );
    const [page, setPage] = useState(1);
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
    const [noteForm, setNoteForm] = useState("");
    const [toast, setToast] = useState<string | null>(null);

    const openTxDetail = (tx: Transaction) => {
        setSelectedTx(tx);
        setNoteForm(tx.note);
    };

    const handleSaveNote = () => {
        showToast("Giao dịch đã ghi sổ được giữ nguyên để đối soát.");
    };

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3500);
    };

    const filtered = (() => {
        const keyword = query.trim().toLowerCase();
        return rows.filter((transaction) => {
            const matchesQuery =
                !keyword ||
                transaction.note.toLowerCase().includes(keyword) ||
                (transaction.warehouseName ?? "")
                    .toLowerCase()
                    .includes(keyword);
            const matchesType =
                typeFilter === "ALL" || transaction.type === typeFilter;
            return matchesQuery && matchesType && (!bucket || dayKey(transaction.createdAt).startsWith(bucket));
        });
    })();

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, pageCount);
    const visible = filtered.slice(
        (safePage - 1) * PAGE_SIZE,
        safePage * PAGE_SIZE,
    );

    function updateFilter<T>(setter: (value: T) => void) {
        return (value: T) => {
            setter(value);
            setPage(1);
        };
    }

    const totalIncome = sums.income;
    const totalExpense = sums.expense;
    const totalFee = sums.fee;
    const profit = sums.net;

    return (
        <>
            <div className="admin-page-head">
                <div>
                    <h2>Tài chính</h2>
                    <p>
                        Giám sát doanh thu, chi phí vận hành và ngân sách của
                        các doanh nghiệp trên nền tảng.
                    </p>
                </div>
                <div className="admin-page-actions">
                    <select
                        className="adm-select"
                        aria-label="Kỳ báo cáo"
                        value={range}
                        onChange={(e) => {setRange(e.target.value);setBucket('');}}
                    >
                        <option value="30">30 ngày</option>
                        <option value="90">90 ngày</option>
                        <option value="365">365 ngày</option>
                    </select>
                    <button
                        className="adm-btn"
                        onClick={() =>
                            downloadCsv(
                                "thu-chi.csv",
                                [
                                    "Mã",
                                    "Ngày",
                                    "Loại",
                                    "Kho",
                                    "Số tiền",
                                    "Ghi chú",
                                ],
                                filtered.map((t) => [
                                    t.id,
                                    t.createdAt,
                                    t.type,
                                    t.warehouseName,
                                    t.amount,
                                    t.note,
                                ]),
                            )
                        }
                    >
                        <Download size={15} /> Xuất báo cáo
                    </button>
                </div>
            </div>

            <WalletPanel/>
            <div className="admin-page-actions">
                <select aria-label="Công ty báo cáo" value={company} onChange={e=>{setCompany(e.target.value);setWarehouse('');setBucket('');}}><option value="">Mọi công ty</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
                <select aria-label="Kho báo cáo" value={warehouse} onChange={e=>setWarehouse(e.target.value)}><option value="">Mọi kho</option>{warehouses.filter(w=>!company||w.ownerCompanyId===company).map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select>
                <select aria-label="Nhóm nghiệp vụ" value={category} onChange={e=>setCategory(e.target.value)}><option value="">Mọi nghiệp vụ</option>{Object.entries(transactionCategoryMeta).map(([v,c])=><option key={v} value={v}>{c.label}</option>)}</select>
                {bucket&&<button onClick={()=>setBucket('')}>Bỏ lọc kỳ {bucket}</button>}
            </div>
            <div className="adm-stats">
                <article className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">Tổng doanh thu</span>
                        <span className="adm-stat-icon is-success">
                            <ArrowUpRight size={17} />
                        </span>
                    </div>
                    <div className="adm-stat-value adm-text-success">
                        {formatCompactCurrency(totalIncome)}
                    </div>
                    <div className="adm-stat-foot">
                        <span className="adm-trend adm-trend-up">
                            {percentLabel(growth(sums.income, previous.income))}
                        </span>
                        <span>so với kỳ trước</span>
                    </div>
                </article>
                <article className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">Tổng chi phí</span>
                        <span className="adm-stat-icon">
                            <ArrowDownRight size={17} />
                        </span>
                    </div>
                    <div className="adm-stat-value adm-text-danger">
                        {formatCompactCurrency(totalExpense)}
                    </div>
                    <div className="adm-stat-foot">
                        <span className="adm-trend adm-trend-down">
                            {percentLabel(
                                growth(sums.expense, previous.expense),
                            )}
                        </span>
                        <span>so với kỳ trước</span>
                    </div>
                </article>
                <article className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">
                            Chênh lệch thu chi
                        </span>
                        <span className="adm-stat-icon is-purple">
                            <Wallet size={17} />
                        </span>
                    </div>
                    <div className="adm-stat-value">
                        {formatCompactCurrency(profit)}
                    </div>
                    <div className="adm-stat-foot">
                        <span>Biên {percentLabel(sums.margin)}</span>
                    </div>
                </article>
                <article className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">Phí nền tảng</span>
                        <span className="adm-stat-icon is-warning">
                            <Receipt size={17} />
                        </span>
                    </div>
                    <div className="adm-stat-value">
                        {formatCompactCurrency(totalFee)}
                    </div>
                    <div className="adm-stat-foot">
                        <span>Phí dịch vụ WareFlow</span>
                    </div>
                </article>
            </div>

            <div className="adm-grid-2">
                <Card title="Dòng tiền trong kỳ" subtitle="Đơn vị: triệu đồng">
                    <div className="adm-chart-box">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={cashflow} onClick={state=>{const point=cashflow[Number(state.activeTooltipIndex)];if(point){setBucket(point.key);setPage(1);}}}
                                margin={{
                                    top: 6,
                                    right: 6,
                                    left: -18,
                                    bottom: 0,
                                }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#eef1f7"
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="month"
                                    tick={{ fontSize: 11, fill: "#9aa4b6" }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fill: "#9aa4b6" }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: "#f6f8fc" }}
                                    contentStyle={{
                                        borderRadius: 10,
                                        border: "1px solid #e6eaf2",
                                        fontSize: 12,
                                    }}
                                    formatter={(
                                        value: number | string,
                                        name: string,
                                    ) => [
                                        `${value} tr`,
                                        name === "income" ? "Thu" : name === "fee" ? "Phí WareFlow" : "Chi trước phí",
                                    ]}
                                />
                                <Bar
                                    dataKey="income"
                                    fill="#4567ed"
                                    radius={[5, 5, 0, 0]}
                                    barSize={18}
                                />
                                <Bar
                                    dataKey="principalExpense"
                                    fill="#f0a5ae"
                                    radius={[5, 5, 0, 0]}
                                    barSize={18}
                                />
                                <Bar dataKey="fee" fill="#9264bd" barSize={18}/>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="adm-chart-legend">
                        <span>
                            <i style={{ background: "#4567ed" }} /> Thu
                        </span>
                        <span>
                            <i style={{ background: "#f0a5ae" }} /> Chi trước phí</span><span><i style={{background:"#9264bd"}}/> Phí WareFlow
                        </span>
                    </div>
                </Card>

                <Card
                    title="Ngân sách theo kho"
                    subtitle="Mức sử dụng hạn mức tháng hiện tại"
                >
                    <ul
                        className="adm-list"
                        style={{ margin: -18, marginTop: -18 }}
                    >
                        {budgets.map((budget) => {
                            const percent = percentage(
                                budget.spent,
                                budget.allocated,
                            );
                            return (
                                <li className="adm-list-item" key={budget.id}>
                                    <div className="adm-list-text">
                                        <strong>
                                            {budget.warehouseName ??
                                                "Tổng công ty"}
                                        </strong>
                                        <div
                                            className="adm-progress-row"
                                            style={{ marginTop: 8 }}
                                        >
                                            <Progress
                                                value={percent ?? 0}
                                                tone={
                                                    (percent ?? 0) >= 90
                                                        ? "danger"
                                                        : (percent ?? 0) >= 70
                                                          ? "warning"
                                                          : "success"
                                                }
                                            />
                                            <span>{percentLabel(percent)}</span>
                                        </div>
                                    </div>
                                    <div className="adm-list-meta">
                                        <strong>
                                            {formatCompactCurrency(
                                                budget.spent,
                                            )}
                                        </strong>
                                        <small>
                                            Hạn mức{" "}
                                            {formatCompactCurrency(
                                                budget.allocated,
                                            )}
                                        </small>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </Card>
            </div>

            <Card bodyClassName="">
                <div className="adm-toolbar">
                    <label className="adm-filter">
                        <Search size={15} />
                        <input
                            className="adm-input"
                            type="search"
                            placeholder="Tìm theo ghi chú, kho…"
                            value={query}
                            onChange={(event) =>
                                updateFilter(setQuery)(event.target.value)
                            }
                            aria-label="Tìm kiếm giao dịch"
                        />
                    </label>
                    <select
                        className="adm-select"
                        value={typeFilter}
                        onChange={(event) =>
                            updateFilter(setTypeFilter)(
                                event.target.value as "ALL" | TransactionType,
                            )
                        }
                        aria-label="Lọc theo loại giao dịch"
                    >
                        <option value="ALL">Tất cả loại</option>
                        <option value="INCOME">Thu</option>
                        <option value="EXPENSE">Chi</option>
                        <option value="SYSTEM_FEE">Phí hệ thống</option>
                    </select>
                    <div className="adm-toolbar-right">
                        <span className="adm-count">
                            {filtered.length} giao dịch
                        </span>
                    </div>
                </div>

                {visible.length === 0 ? (
                    <EmptyState
                        icon={<Receipt size={22} />}
                        title="Không tìm thấy giao dịch"
                        description="Không có giao dịch nào khớp với điều kiện đang lọc."
                    />
                ) : (
                    <div className="adm-table-wrap">
                        <table className="adm-table">
                            <thead>
                                <tr>
                                    <th>Loại</th>
                                    <th>Hạng mục</th>
                                    <th>Kho</th>
                                    <th>Ghi chú</th>
                                    <th className="adm-text-right">Số tiền</th>
                                    <th>Thời gian</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((transaction) => {
                                    const type =
                                        transactionTypeMeta[transaction.type];
                                    const category =
                                        transactionCategoryMeta[
                                            transaction.category
                                        ];
                                    const isIncome =
                                        transaction.type === "INCOME";
                                    return (
                                        <tr
                                            key={transaction.id}
                                            onClick={() =>
                                                openTxDetail(transaction)
                                            }
                                            title="Nhấp để xem sổ cái giao dịch"
                                        >
                                            <td>
                                                <Badge
                                                    label={type.label}
                                                    tone={type.tone}
                                                />
                                            </td>
                                            <td>{category.label}</td>
                                            <td>
                                                {transaction.warehouseName ??
                                                    "Toàn hệ thống"}
                                            </td>
                                            <td className="adm-muted">
                                                {transaction.note}
                                            </td>
                                            <td
                                                className={`adm-text-right adm-cell-main ${isIncome ? "adm-text-success" : "adm-text-danger"}`}
                                            >
                                                {isIncome ? "+" : "−"}
                                                {formatCurrency(
                                                    transaction.amount,
                                                )}
                                            </td>
                                            <td className="adm-muted">
                                                {formatDateTime(
                                                    transaction.createdAt,
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {filtered.length > 0 && (
                    <Pagination
                        page={safePage}
                        pageCount={pageCount}
                        total={filtered.length}
                        onChange={setPage}
                    />
                )}
            </Card>

            {toast && (
                <div
                    style={{
                        position: "fixed",
                        bottom: 24,
                        right: 24,
                        zIndex: 99,
                        background: "#1f2937",
                        color: "#fff",
                        padding: "12px 20px",
                        borderRadius: 10,
                        fontSize: 13,
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                    }}
                >
                    <Check size={16} color="#10b981" />
                    <span>{toast}</span>
                </div>
            )}

            {selectedTx && (
                <Modal
                    title={`Sổ cái giao dịch #${selectedTx.id}`}
                    description={`Chứng từ hạch toán · finance-service: transactions`}
                    onClose={() => setSelectedTx(null)}
                    footer={
                        <div
                            style={{
                                display: "flex",
                                width: "100%",
                                justifyContent: "space-between",
                                alignItems: "center",
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 11,
                                    color: "#6b7280",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                }}
                            >
                                <ShieldCheck size={14} color="#10b981" /> Sổ cái
                                kế toán bất biến (Immutable Ledger)
                            </span>
                            <div style={{ display: "flex", gap: 8 }}>
                                <button
                                    className="adm-btn"
                                    onClick={() => setSelectedTx(null)}
                                >
                                    Đóng
                                </button>
                                <button
                                    className="adm-btn adm-btn-primary"
                                    disabled
                                    title="Giao dịch đã ghi sổ"
                                    onClick={handleSaveNote}
                                >
                                    <Check size={14} /> Lưu giải trình
                                </button>
                            </div>
                        </div>
                    }
                >
                    <div
                        style={{
                            padding: "12px 14px",
                            borderRadius: 8,
                            marginBottom: 16,
                            fontSize: 12.5,
                            lineHeight: 1.5,
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            color: "#334155",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                gap: 8,
                                alignItems: "flex-start",
                            }}
                        >
                            <Info
                                size={16}
                                color="#3b82f6"
                                style={{ flexShrink: 0, marginTop: 2 }}
                            />
                            <div>
                                <strong>
                                    Ràng buộc kế toán tài chính
                                    (finance-service: transactions):
                                </strong>
                                <p style={{ margin: "4px 0 0" }}>
                                    Theo quy tắc toàn vẹn CSDL và luật kế toán,
                                    giao dịch đã ghi nhận không được phép xóa
                                    hoặc sửa đổi số tiền, loại giao dịch (INCOME
                                    / EXPENSE) và tài khoản nguồn. Bạn chỉ được
                                    phép bổ sung/cập nhật ghi chú giải trình
                                    nghiệp vụ.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="adm-form">
                        <div className="adm-field-grid">
                            <div className="adm-field">
                                <label>Mã giao dịch (BIGSERIAL PK)</label>
                                <input
                                    className="adm-input"
                                    value={`TX-${selectedTx.id}`}
                                    disabled
                                    style={{
                                        background: "#f8fafc",
                                        cursor: "not-allowed",
                                    }}
                                />
                            </div>
                            <div className="adm-field">
                                <label>Loại giao dịch</label>
                                <input
                                    className="adm-input"
                                    value={
                                        transactionTypeMeta[selectedTx.type]
                                            .label
                                    }
                                    disabled
                                    style={{
                                        background: "#f8fafc",
                                        cursor: "not-allowed",
                                    }}
                                />
                            </div>
                        </div>
                        <div className="adm-field-grid">
                            <div className="adm-field">
                                <label>Số tiền hạch toán</label>
                                <input
                                    className="adm-input"
                                    value={`${selectedTx.type === "INCOME" ? "+" : "−"} ${formatCurrency(selectedTx.amount)}`}
                                    disabled
                                    style={{
                                        background: "#f8fafc",
                                        cursor: "not-allowed",
                                        fontWeight: 600,
                                        color:
                                            selectedTx.type === "INCOME"
                                                ? "#16a34a"
                                                : "#dc2626",
                                    }}
                                />
                            </div>
                            <div className="adm-field">
                                <label>Phí ghi nhận trong giao dịch</label>
                                <input
                                    className="adm-input"
                                    value={
                                        selectedTx.type === "SYSTEM_FEE"
                                            ? formatCurrency(selectedTx.amount)
                                            : "Xem giao dịch phí riêng"
                                    }
                                    disabled
                                    style={{
                                        background: "#f8fafc",
                                        cursor: "not-allowed",
                                    }}
                                />
                            </div>
                        </div>
                        <div className="adm-field-grid">
                            <div className="adm-field">
                                <label>Hạng mục</label>
                                <input
                                    className="adm-input"
                                    value={
                                        transactionCategoryMeta[
                                            selectedTx.category
                                        ].label
                                    }
                                    disabled
                                    style={{
                                        background: "#f8fafc",
                                        cursor: "not-allowed",
                                    }}
                                />
                            </div>
                            <div className="adm-field">
                                <label>Kho liên kết</label>
                                <input
                                    className="adm-input"
                                    value={
                                        selectedTx.warehouseName ??
                                        "Toàn hệ thống"
                                    }
                                    disabled
                                    style={{
                                        background: "#f8fafc",
                                        cursor: "not-allowed",
                                    }}
                                />
                            </div>
                        </div>
                        <div className="adm-field">
                            <p>Mã chứng từ {selectedTx.refDocumentId || selectedTx.id}</p><label>Thời điểm phát sinh</label>
                            <input
                                className="adm-input"
                                value={formatDateTime(selectedTx.createdAt)}
                                disabled
                                style={{
                                    background: "#f8fafc",
                                    cursor: "not-allowed",
                                }}
                            />
                        </div>
                        <div className="adm-field">
                            <label>Ghi chú & Giải trình kế toán</label>
                            <textarea
                                className="adm-input"
                                rows={3}
                                readOnly
                                value={noteForm}
                                onChange={(e) => setNoteForm(e.target.value)}
                                placeholder="Nhập ghi chú giải trình giao dịch…"
                            />
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
}
