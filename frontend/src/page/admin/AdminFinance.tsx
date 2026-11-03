import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Download, Receipt, Search, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, Card, EmptyState, Pagination, Progress } from '../../components/admin/AdminUI';
import { budgets, transactions } from '../../data/adminData';
import type { TransactionType } from '../../types/admin';
import { formatCompactCurrency, formatCurrency, formatDateTime, transactionCategoryMeta, transactionTypeMeta } from '../../utils/format';

const PAGE_SIZE = 6;

const cashflow = [
    { month: 'T5', income: 312, expense: 186 },
    { month: 'T6', income: 358, expense: 204 },
    { month: 'T7', income: 331, expense: 192 },
    { month: 'T8', income: 402, expense: 228 },
    { month: 'T9', income: 447, expense: 241 },
    { month: 'T10', income: 512, expense: 268 },
];

export default function AdminFinance() {
    const [query, setQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<'ALL' | TransactionType>('ALL');
    const [page, setPage] = useState(1);

    const filtered = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        return transactions.filter((transaction) => {
            const matchesQuery =
                !keyword ||
                transaction.note.toLowerCase().includes(keyword) ||
                (transaction.warehouseName ?? '').toLowerCase().includes(keyword);
            const matchesType = typeFilter === 'ALL' || transaction.type === typeFilter;
            return matchesQuery && matchesType;
        });
    }, [query, typeFilter]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, pageCount);
    const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    function updateFilter<T>(setter: (value: T) => void) {
        return (value: T) => {
            setter(value);
            setPage(1);
        };
    }

    const totalIncome = transactions.filter((t) => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter((t) => t.type !== 'INCOME').reduce((sum, t) => sum + t.amount, 0);
    const totalFee = transactions.filter((t) => t.type === 'SYSTEM_FEE').reduce((sum, t) => sum + t.amount, 0);
    const profit = totalIncome - totalExpense;

    return (
        <>
            <div className="admin-page-head">
                <div>
                    <h2>Tài chính</h2>
                    <p>Giám sát doanh thu, chi phí vận hành và ngân sách của các doanh nghiệp trên nền tảng.</p>
                </div>
                <div className="admin-page-actions">
                    <button className="adm-btn">
                        <Download size={15} /> Xuất báo cáo
                    </button>
                </div>
            </div>

            <div className="adm-stats">
                <article className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">Tổng doanh thu</span>
                        <span className="adm-stat-icon is-success">
                            <ArrowUpRight size={17} />
                        </span>
                    </div>
                    <div className="adm-stat-value adm-text-success">{formatCompactCurrency(totalIncome)}</div>
                    <div className="adm-stat-foot">
                        <span className="adm-trend adm-trend-up">▲ 14.6%</span>
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
                    <div className="adm-stat-value adm-text-danger">{formatCompactCurrency(totalExpense)}</div>
                    <div className="adm-stat-foot">
                        <span className="adm-trend adm-trend-down">▼ 8.2%</span>
                        <span>so với kỳ trước</span>
                    </div>
                </article>
                <article className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">Lợi nhuận gộp</span>
                        <span className="adm-stat-icon is-purple">
                            <Wallet size={17} />
                        </span>
                    </div>
                    <div className="adm-stat-value">{formatCompactCurrency(profit)}</div>
                    <div className="adm-stat-foot">
                        <span>Biên {Math.round((profit / totalIncome) * 100)}%</span>
                    </div>
                </article>
                <article className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">Phí nền tảng</span>
                        <span className="adm-stat-icon is-warning">
                            <Receipt size={17} />
                        </span>
                    </div>
                    <div className="adm-stat-value">{formatCompactCurrency(totalFee)}</div>
                    <div className="adm-stat-foot">
                        <span>Phí dịch vụ WareFlow</span>
                    </div>
                </article>
            </div>

            <div className="adm-grid-2">
                <Card title="Dòng tiền theo tháng" subtitle="Đơn vị: triệu đồng">
                    <div className="adm-chart-box">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={cashflow} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" vertical={false} />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9aa4b6' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#9aa4b6' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    cursor={{ fill: '#f6f8fc' }}
                                    contentStyle={{ borderRadius: 10, border: '1px solid #e6eaf2', fontSize: 12 }}
                                    formatter={(value: number | string, name: string) => [`${value} tr`, name === 'income' ? 'Thu' : 'Chi']}
                                />
                                <Bar dataKey="income" fill="#4567ed" radius={[5, 5, 0, 0]} barSize={18} />
                                <Bar dataKey="expense" fill="#f0a5ae" radius={[5, 5, 0, 0]} barSize={18} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="adm-chart-legend">
                        <span>
                            <i style={{ background: '#4567ed' }} /> Thu
                        </span>
                        <span>
                            <i style={{ background: '#f0a5ae' }} /> Chi
                        </span>
                    </div>
                </Card>

                <Card title="Ngân sách theo kho" subtitle="Mức sử dụng hạn mức tháng 10/2026">
                    <ul className="adm-list" style={{ margin: -18, marginTop: -18 }}>
                        {budgets.map((budget) => {
                            const percent = Math.round((budget.spent / budget.allocated) * 100);
                            return (
                                <li className="adm-list-item" key={budget.id}>
                                    <div className="adm-list-text">
                                        <strong>{budget.warehouseName ?? 'Tổng công ty'}</strong>
                                        <div className="adm-progress-row" style={{ marginTop: 8 }}>
                                            <Progress value={percent} tone={percent >= 90 ? 'danger' : percent >= 70 ? 'warning' : 'success'} />
                                            <span>{percent}%</span>
                                        </div>
                                    </div>
                                    <div className="adm-list-meta">
                                        <strong>{formatCompactCurrency(budget.spent)}</strong>
                                        <small>Hạn mức {formatCompactCurrency(budget.allocated)}</small>
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
                            onChange={(event) => updateFilter(setQuery)(event.target.value)}
                            aria-label="Tìm kiếm giao dịch"
                        />
                    </label>
                    <select
                        className="adm-select"
                        value={typeFilter}
                        onChange={(event) => updateFilter(setTypeFilter)(event.target.value as 'ALL' | TransactionType)}
                        aria-label="Lọc theo loại giao dịch"
                    >
                        <option value="ALL">Tất cả loại</option>
                        <option value="INCOME">Thu</option>
                        <option value="EXPENSE">Chi</option>
                        <option value="SYSTEM_FEE">Phí hệ thống</option>
                    </select>
                    <div className="adm-toolbar-right">
                        <span className="adm-count">{filtered.length} giao dịch</span>
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
                                    const type = transactionTypeMeta[transaction.type];
                                    const category = transactionCategoryMeta[transaction.category];
                                    const isIncome = transaction.type === 'INCOME';
                                    return (
                                        <tr key={transaction.id}>
                                            <td>
                                                <Badge label={type.label} tone={type.tone} />
                                            </td>
                                            <td>{category.label}</td>
                                            <td>{transaction.warehouseName ?? 'Toàn hệ thống'}</td>
                                            <td className="adm-muted">{transaction.note}</td>
                                            <td className={`adm-text-right adm-cell-main ${isIncome ? 'adm-text-success' : 'adm-text-danger'}`}>
                                                {isIncome ? '+' : '−'}
                                                {formatCurrency(transaction.amount)}
                                            </td>
                                            <td className="adm-muted">{formatDateTime(transaction.createdAt)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {filtered.length > 0 && (
                    <Pagination page={safePage} pageCount={pageCount} total={filtered.length} onChange={setPage} />
                )}
            </Card>
        </>
    );
}
