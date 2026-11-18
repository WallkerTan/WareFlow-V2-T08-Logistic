import { useState } from "react";
import { Modal } from "antd";
import {
    budgetMoney,
    budgetStatus,
    resolveBudgetRequest,
} from "../../data/budgetRequests";
import type { BudgetRequest } from "../../data/budgetRequests";
import { useAdminData, saveResource } from "../../services/data";
import { Wallet, AlertCircle } from "lucide-react";
import "./budget.css";

export default function BudgetRequestList({
    requests,
    companyView = false,
}: {
    requests: BudgetRequest[];
    companyView?: boolean;
}) {
    const { raw } = useAdminData('transactions');
    const companyBalance = raw.transactions.reduce((acc, t) => acc + (t.type === 'INCOME' ? Number(t.amount || 0) : -Number(t.amount || 0)), 0);

    const [query, setQuery] = useState("");
    const [status, setStatus] = useState("all");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [response, setResponse] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const selected = requests.find((r) => r.id === selectedId);
    const filtered = requests.filter(
        (r) =>
            (status === "all" || r.status === status) &&
            `${r.id} ${r.warehouseName} ${r.purpose}`
                .toLocaleLowerCase("vi")
                .includes(query.toLocaleLowerCase("vi")),
    );
    async function resolve(next: "approved" | "rejected" | "cancelled") {
        if (!selected || busy) return;
        if (next === "approved" && selected.amount > companyBalance) {
            setError(`Số dư khả dụng của công ty (${budgetMoney(companyBalance)}) không đủ để duyệt yêu cầu cấp ${budgetMoney(selected.amount)}.`);
            return;
        }
        setBusy(true);
        try {
            await resolveBudgetRequest(selected.id, next, response);
            if (next === "approved") {
                try {
                    await saveResource("finance", "/transactions", "POST", {
                        warehouseId: selected.warehouseId,
                        type: "EXPENSE",
                        category: "TRANSFER",
                        amount: selected.amount,
                        note: `Cấp ngân sách cho kho ${selected.warehouseName} theo yêu cầu #${selected.id}: ${selected.purpose}`
                    });
                } catch {
                    // ignore if already synced
                }
            }
            setSelectedId(null);
            setError("");
        } catch (e) {
            setError(
                e instanceof Error ? e.message : "Không thể lưu thay đổi.",
            );
        } finally {
            setBusy(false);
        }
    }
    return (
        <section className="wf-card budget-requests">
            {companyView && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'var(--workspace-gradient)', color: '#063426', borderRadius: 8, marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 8, background: 'rgba(0,0,0,0.08)', display: 'grid', placeItems: 'center' }}>
                            <Wallet size={24} color="#063426" />
                        </div>
                        <div>
                            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.85, fontWeight: 600 }}>
                                Số dư khả dụng hiện tại của công ty
                            </span>
                            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 1 }}>
                                {budgetMoney(companyBalance)}
                            </div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 13, opacity: 0.9 }}>
                        Khi duyệt yêu cầu từ kho, kinh phí sẽ được lấy trực tiếp từ số dư này.
                    </div>
                </div>
            )}
            <div className="wf-section-heading">
                <div>
                    <h2>
                        {companyView
                            ? "Đề nghị chi từ kho"
                            : "Lịch sử đề nghị chi"}
                    </h2>
                    <p>
                        {requests.length} yêu cầu · Chọn mã yêu cầu để xem chi tiết.
                    </p>
                </div>
            </div>
            <div className="budget-filters">
                <label className="wf-field">
                    <span>Tìm yêu cầu</span>
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Mã yêu cầu, tên kho hoặc nội dung"
                    />
                </label>
                <label className="wf-field">
                    <span>Trạng thái</span>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                    >
                        <option value="all">Tất cả trạng thái</option>
                        {Object.entries(budgetStatus).map(([value, label]) => (
                            <option value={value} key={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
            <div className="workspace-table">
                <table>
                    <thead>
                        <tr>
                            <th>Mã yêu cầu</th>
                            <th>Kho</th>
                            <th>Nội dung</th>
                            <th>Số tiền</th>
                            <th>Ngày cần cấp</th>
                            <th>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((r) => (
                            <tr key={r.id}>
                                <td>
                                    <button
                                        className="budget-text-button"
                                        onClick={() => {
                                            setSelectedId(r.id);
                                            setResponse("");
                                            setError("");
                                        }}
                                    >
                                        {r.id}
                                    </button>
                                </td>
                                <td>{r.warehouseName}</td>
                                <td className="budget-purpose">{r.purpose}</td>
                                <td>{budgetMoney(r.amount)}</td>
                                <td>
                                    {r.neededBy
                                        ? r.neededBy
                                              .split("-")
                                              .reverse()
                                              .join("/")
                                        : "—"}
                                </td>
                                <td>
                                    <span
                                        className={`budget-status is-${r.status}`}
                                    >
                                        {budgetStatus[r.status]}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {!filtered.length && (
                            <tr>
                                <td colSpan={6} className="workspace-empty">
                                    Không có yêu cầu phù hợp bộ lọc.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <Modal
                title="Chi tiết đề nghị chi"
                open={!!selected}
                onCancel={() => setSelectedId(null)}
                footer={null}
                width={600}
            >
                {selected && (
                    <div className="budget-request-detail">
                        <span className={`budget-status is-${selected.status}`}>
                            {budgetStatus[selected.status]}
                        </span>
                        <h3>{selected.id}</h3>
                        <dl>
                            <dt>Kho yêu cầu</dt>
                            <dd>{selected.warehouseName}</dd>
                            <dt>Công ty</dt>
                            <dd>{selected.company}</dd>
                            <dt>Số tiền yêu cầu</dt>
                            <dd>
                                <strong>{budgetMoney(selected.amount)}</strong>
                            </dd>
                            <dt>Ngày cần cấp</dt>
                            <dd>
                                {selected.neededBy
                                    ? selected.neededBy
                                          .split("-")
                                          .reverse()
                                          .join("/")
                                    : "—"}
                            </dd>
                            <dt>Ngày tạo</dt>
                            <dd>
                                {new Date(selected.createdAt).toLocaleString(
                                    "vi-VN",
                                )}
                            </dd>
                        </dl>
                        <h4>Mục đích sử dụng</h4>
                        <p>{selected.purpose}</p>
                        {selected.response && (
                            <>
                                <h4>Phản hồi từ công ty</h4>
                                <p>{selected.response}</p>
                            </>
                        )}
                        {companyView && selected.status === "pending" && (
                            <div style={{ margin: '14px 0', padding: '12px 14px', background: companyBalance >= selected.amount ? '#f0fdf4' : '#fef2f2', border: `1px solid ${companyBalance >= selected.amount ? '#bbf7d0' : '#fecaca'}`, borderRadius: 6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                    <span>Số dư khả dụng hiện tại:</span>
                                    <strong style={{ color: companyBalance >= 0 ? '#15803d' : '#b91c1c' }}>{budgetMoney(companyBalance)}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 4 }}>
                                    <span>Số dư sau khi duyệt cấp:</span>
                                    <strong style={{ color: (companyBalance - selected.amount) >= 0 ? '#15803d' : '#b91c1c' }}>{budgetMoney(companyBalance - selected.amount)}</strong>
                                </div>
                                {companyBalance < selected.amount && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b91c1c', fontSize: 12, marginTop: 8, fontWeight: 500 }}>
                                        <AlertCircle size={15} />
                                        <span>Số dư công ty không đủ để duyệt khoản chi này. Hãy nạp thêm quỹ trước khi duyệt.</span>
                                    </div>
                                )}
                            </div>
                        )}
                        {selected.status === "pending" && companyView && (
                            <label className="wf-field">
                                <span>Phản hồi / lý do từ chối</span>
                                <textarea
                                    maxLength={1000}
                                    value={response}
                                    onChange={(e) =>
                                        setResponse(e.target.value)
                                    }
                                    placeholder="Bắt buộc khi từ chối yêu cầu"
                                />
                            </label>
                        )}
                        {error && (
                            <p role="alert" className="budget-error">
                                {error}
                            </p>
                        )}
                        {selected.status === "pending" && (
                            <div className="budget-actions">
                                {companyView ? (
                                    <>
                                        <button
                                            className="wf-button wf-button-secondary"
                                            disabled={busy}
                                            onClick={() => resolve("rejected")}
                                        >
                                            Từ chối
                                        </button>
                                        <button
                                            className="wf-button wf-button-primary"
                                            disabled={busy || companyBalance < selected.amount}
                                            onClick={() => resolve("approved")}
                                        >
                                            Duyệt chi
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        title="Liên hệ công ty để từ chối đề nghị"
                                        className="wf-button wf-button-secondary"
                                        disabled
                                        onClick={() => resolve("cancelled")}
                                    >
                                        Hủy yêu cầu
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </section>
    );
}
