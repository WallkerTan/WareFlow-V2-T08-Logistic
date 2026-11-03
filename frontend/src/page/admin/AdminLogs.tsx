import { useMemo, useState } from 'react';
import { Download, Fingerprint, Search, ShieldCheck } from 'lucide-react';
import { Card, EmptyState, Pagination, Badge } from '../../components/admin/AdminUI';
import { systemLogs } from '../../data/adminData';
import { formatDateTime, formatRelativeTime } from '../../utils/format';

const PAGE_SIZE = 8;

const actionMeta: Record<string, { label: string; tone: 'info' | 'success' | 'warning' | 'danger' | 'neutral' | 'purple' }> = {
    COMPANY_APPROVE: { label: 'Phê duyệt công ty', tone: 'success' },
    COMPANY_LOCK: { label: 'Khoá công ty', tone: 'danger' },
    WAREHOUSE_CREATE: { label: 'Tạo kho hàng', tone: 'info' },
    USER_LOGIN: { label: 'Đăng nhập', tone: 'neutral' },
    PASSWORD_RESET: { label: 'Đặt lại mật khẩu', tone: 'warning' },
    EXPORT_DATA: { label: 'Xuất dữ liệu', tone: 'purple' },
};

export default function AdminLogs() {
    const [query, setQuery] = useState('');
    const [actionFilter, setActionFilter] = useState('ALL');
    const [page, setPage] = useState(1);

    const filtered = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        return systemLogs.filter((entry) => {
            const matchesQuery =
                !keyword ||
                entry.action.toLowerCase().includes(keyword) ||
                entry.actorName.toLowerCase().includes(keyword) ||
                entry.target.toLowerCase().includes(keyword) ||
                entry.ipAddress.includes(keyword);
            const matchesAction = actionFilter === 'ALL' || entry.action === actionFilter;
            return matchesQuery && matchesAction;
        });
    }, [query, actionFilter]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, pageCount);
    const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    function updateFilter<T>(setter: (value: T) => void) {
        return (value: T) => {
            setter(value);
            setPage(1);
        };
    }

    return (
        <>
            <div className="admin-page-head">
                <div>
                    <h2>Nhật ký hệ thống</h2>
                    <p>Dấu vết toàn bộ thao tác quản trị, giúp đối chiếu và điều tra khi cần thiết.</p>
                </div>
                <div className="admin-page-actions">
                    <button className="adm-btn">
                        <Download size={15} /> Xuất nhật ký
                    </button>
                </div>
            </div>

            <div className="adm-stats">
                <article className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">Tổng sự kiện</span>
                        <span className="adm-stat-icon">
                            <ShieldCheck size={17} />
                        </span>
                    </div>
                    <div className="adm-stat-value">{systemLogs.length}</div>
                    <div className="adm-stat-foot">
                        <span>Được ghi nhận tự động</span>
                    </div>
                </article>
                <article className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">Địa chỉ IP theo dõi</span>
                        <span className="adm-stat-icon is-purple">
                            <Fingerprint size={17} />
                        </span>
                    </div>
                    <div className="adm-stat-value">{new Set(systemLogs.map((entry) => entry.ipAddress)).size}</div>
                    <div className="adm-stat-foot">
                        <span>Nguồn truy cập khác nhau</span>
                    </div>
                </article>
                <article className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">Người thực hiện</span>
                        <span className="adm-stat-icon is-success">
                            <ShieldCheck size={17} />
                        </span>
                    </div>
                    <div className="adm-stat-value">{new Set(systemLogs.map((entry) => entry.actorName)).size}</div>
                    <div className="adm-stat-foot">
                        <span>Tài khoản quản trị</span>
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
                            placeholder="Tìm theo hành động, người thực hiện, IP…"
                            value={query}
                            onChange={(event) => updateFilter(setQuery)(event.target.value)}
                            aria-label="Tìm kiếm nhật ký"
                        />
                    </label>
                    <select
                        className="adm-select"
                        value={actionFilter}
                        onChange={(event) => updateFilter(setActionFilter)(event.target.value)}
                        aria-label="Lọc theo hành động"
                    >
                        <option value="ALL">Tất cả hành động</option>
                        {Object.entries(actionMeta).map(([value, meta]) => (
                            <option key={value} value={value}>
                                {meta.label}
                            </option>
                        ))}
                    </select>
                    <div className="adm-toolbar-right">
                        <span className="adm-count">{filtered.length} bản ghi</span>
                    </div>
                </div>

                {visible.length === 0 ? (
                    <EmptyState
                        icon={<ShieldCheck size={22} />}
                        title="Không tìm thấy nhật ký"
                        description="Không có bản ghi nào khớp với điều kiện đang lọc."
                    />
                ) : (
                    <div className="adm-table-wrap">
                        <table className="adm-table">
                            <thead>
                                <tr>
                                    <th>Hành động</th>
                                    <th>Người thực hiện</th>
                                    <th>Đối tượng</th>
                                    <th>Địa chỉ IP</th>
                                    <th>Thời gian</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((entry) => {
                                    const meta = actionMeta[entry.action] ?? { label: entry.action, tone: 'neutral' as const };
                                    return (
                                        <tr key={entry.id}>
                                            <td>
                                                <Badge label={meta.label} tone={meta.tone} />
                                            </td>
                                            <td>
                                                <span className="adm-cell-main">{entry.actorName}</span>
                                                <span className="adm-cell-sub">{entry.companyName}</span>
                                            </td>
                                            <td>{entry.target}</td>
                                            <td className="adm-mono">{entry.ipAddress}</td>
                                            <td className="adm-muted" title={formatDateTime(entry.createdAt)}>
                                                {formatRelativeTime(entry.createdAt)}
                                            </td>
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
