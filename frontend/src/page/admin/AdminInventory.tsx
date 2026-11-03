import { useMemo, useState } from 'react';
import { ClipboardList, Download, Plus, Search } from 'lucide-react';
import { Badge, Card, EmptyState, Pagination } from '../../components/admin/AdminUI';
import { stockDocuments } from '../../data/adminData';
import type { StockDocumentStatus } from '../../types/admin';
import { formatDate, stockDocumentStatusMeta, stockDocumentTypeMeta } from '../../utils/format';

const PAGE_SIZE = 6;

export default function AdminInventory() {
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | StockDocumentStatus>('ALL');
    const [page, setPage] = useState(1);

    const filtered = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        return stockDocuments.filter((document) => {
            const matchesQuery =
                !keyword ||
                document.code.toLowerCase().includes(keyword) ||
                document.partner.toLowerCase().includes(keyword) ||
                document.warehouseName.toLowerCase().includes(keyword);
            const matchesStatus = statusFilter === 'ALL' || document.status === statusFilter;
            return matchesQuery && matchesStatus;
        });
    }, [query, statusFilter]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, pageCount);
    const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    function updateFilter<T>(setter: (value: T) => void) {
        return (value: T) => {
            setter(value);
            setPage(1);
        };
    }

    const pendingCount = stockDocuments.filter((document) => document.status === 'PENDING_APPROVAL').length;

    return (
        <>
            <div className="admin-page-head">
                <div>
                    <h2>Chứng từ kho</h2>
                    <p>Theo dõi đơn mua, phiếu nhập xuất, điều chỉnh và kiểm kê tồn kho trên toàn hệ thống.</p>
                </div>
                <div className="admin-page-actions">
                    <button className="adm-btn">
                        <Download size={15} /> Xuất báo cáo
                    </button>
                    <button className="adm-btn adm-btn-primary">
                        <Plus size={16} /> Tạo chứng từ
                    </button>
                </div>
            </div>

            <div className="adm-stats">
                <article className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">Tổng chứng từ</span>
                        <span className="adm-stat-icon">
                            <ClipboardList size={17} />
                        </span>
                    </div>
                    <div className="adm-stat-value">{stockDocuments.length}</div>
                    <div className="adm-stat-foot">
                        <span>Trong kỳ báo cáo hiện tại</span>
                    </div>
                </article>
                <article className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">Chờ phê duyệt</span>
                        <span className="adm-stat-icon is-warning">
                            <ClipboardList size={17} />
                        </span>
                    </div>
                    <div className="adm-stat-value">{pendingCount}</div>
                    <div className="adm-stat-foot">
                        <span>Cần quản trị xử lý</span>
                    </div>
                </article>
                <article className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">Đã hoàn tất</span>
                        <span className="adm-stat-icon is-success">
                            <ClipboardList size={17} />
                        </span>
                    </div>
                    <div className="adm-stat-value">
                        {stockDocuments.filter((document) => document.status === 'DONE').length}
                    </div>
                    <div className="adm-stat-foot">
                        <span>Đã áp dụng vào kho</span>
                    </div>
                </article>
            </div>

            <Card bodyClassName="">
                <div className="adm-toolbar">
                    <label className="adm-filter">
                        <Search size={15} />
                        <input
                            className="adm-input"
                            type="search"
                            placeholder="Tìm theo mã chứng từ, đối tác, kho…"
                            value={query}
                            onChange={(event) => updateFilter(setQuery)(event.target.value)}
                            aria-label="Tìm kiếm chứng từ kho"
                        />
                    </label>
                    <select
                        className="adm-select"
                        value={statusFilter}
                        onChange={(event) => updateFilter(setStatusFilter)(event.target.value as 'ALL' | StockDocumentStatus)}
                        aria-label="Lọc theo trạng thái chứng từ"
                    >
                        <option value="ALL">Tất cả trạng thái</option>
                        {Object.entries(stockDocumentStatusMeta).map(([value, meta]) => (
                            <option key={value} value={value}>
                                {meta.label}
                            </option>
                        ))}
                    </select>
                    <div className="adm-toolbar-right">
                        <span className="adm-count">{filtered.length} chứng từ</span>
                    </div>
                </div>

                {visible.length === 0 ? (
                    <EmptyState
                        icon={<ClipboardList size={22} />}
                        title="Không tìm thấy chứng từ"
                        description="Không có chứng từ kho nào khớp với điều kiện đang lọc."
                    />
                ) : (
                    <div className="adm-table-wrap">
                        <table className="adm-table">
                            <thead>
                                <tr>
                                    <th>Mã chứng từ</th>
                                    <th>Loại</th>
                                    <th>Kho</th>
                                    <th>Đối tác</th>
                                    <th>Số mục</th>
                                    <th>Trạng thái</th>
                                    <th>Ngày tạo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((document) => {
                                    const status = stockDocumentStatusMeta[document.status];
                                    return (
                                        <tr key={document.id}>
                                            <td className="adm-mono adm-cell-main">{document.code}</td>
                                            <td>{stockDocumentTypeMeta[document.type].label}</td>
                                            <td>{document.warehouseName}</td>
                                            <td>{document.partner}</td>
                                            <td>{document.itemCount}</td>
                                            <td>
                                                <Badge label={status.label} tone={status.tone} />
                                            </td>
                                            <td className="adm-muted">{formatDate(document.createdAt)}</td>
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
