import { useMemo, useState } from 'react';
import { Bell, Check, CheckCheck, Filter, Search } from 'lucide-react';
import { Badge, Card, EmptyState } from '../../components/admin/AdminUI';
import { notifications as seedNotifications } from '../../data/adminData';
import type { NotificationScope } from '../../types/admin';
import { formatDateTime, formatRelativeTime } from '../../utils/format';

const scopeMeta: Record<NotificationScope, { label: string; tone: 'info' | 'purple' | 'neutral' }> = {
    SYSTEM: { label: 'Hệ thống', tone: 'purple' },
    COMPANY: { label: 'Công ty', tone: 'info' },
    WAREHOUSE: { label: 'Kho', tone: 'neutral' },
};

export default function AdminNotifications() {
    const [rows, setRows] = useState(seedNotifications);
    const [query, setQuery] = useState('');
    const [scopeFilter, setScopeFilter] = useState<'ALL' | NotificationScope>('ALL');
    const [readFilter, setReadFilter] = useState<'ALL' | 'UNREAD'>('ALL');

    const filtered = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        return rows.filter((notification) => {
            const matchesQuery =
                !keyword ||
                notification.title.toLowerCase().includes(keyword) ||
                notification.body.toLowerCase().includes(keyword);
            const matchesScope = scopeFilter === 'ALL' || notification.scope === scopeFilter;
            const matchesRead = readFilter === 'ALL' || (readFilter === 'UNREAD' ? !notification.isRead : notification.isRead);
            return matchesQuery && matchesScope && matchesRead;
        });
    }, [rows, query, scopeFilter, readFilter]);

    const unreadCount = rows.filter((notification) => !notification.isRead).length;

    function markAllRead() {
        setRows((current) => current.map((notification) => ({ ...notification, isRead: true })));
    }

    function toggleRead(id: string) {
        setRows((current) => current.map((notification) => (notification.id === id ? { ...notification, isRead: !notification.isRead } : notification)));
    }

    return (
        <>
            <div className="admin-page-head">
                <div>
                    <h2>Trung tâm thông báo</h2>
                    <p>Theo dõi các sự kiện quan trọng phát sinh từ doanh nghiệp, kho hàng và hệ thống.</p>
                </div>
                <div className="admin-page-actions">
                    <button className="adm-btn" onClick={markAllRead} disabled={unreadCount === 0}>
                        <CheckCheck size={15} /> Đánh dấu đã đọc tất cả
                    </button>
                </div>
            </div>

            <div className="adm-stats">
                <article className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">Tổng thông báo</span>
                        <span className="adm-stat-icon">
                            <Bell size={17} />
                        </span>
                    </div>
                    <div className="adm-stat-value">{rows.length}</div>
                    <div className="adm-stat-foot">
                        <span>Trong kỳ báo cáo</span>
                    </div>
                </article>
                <article className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">Chưa đọc</span>
                        <span className="adm-stat-icon is-warning">
                            <Bell size={17} />
                        </span>
                    </div>
                    <div className="adm-stat-value">{unreadCount}</div>
                    <div className="adm-stat-foot">
                        <span>Cần xử lý</span>
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
                            placeholder="Tìm theo tiêu đề, nội dung…"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            aria-label="Tìm kiếm thông báo"
                        />
                    </label>
                    <select
                        className="adm-select"
                        value={scopeFilter}
                        onChange={(event) => setScopeFilter(event.target.value as 'ALL' | NotificationScope)}
                        aria-label="Lọc theo phạm vi"
                    >
                        <option value="ALL">Tất cả phạm vi</option>
                        <option value="SYSTEM">Hệ thống</option>
                        <option value="COMPANY">Công ty</option>
                        <option value="WAREHOUSE">Kho</option>
                    </select>
                    <select
                        className="adm-select"
                        value={readFilter}
                        onChange={(event) => setReadFilter(event.target.value as 'ALL' | 'UNREAD')}
                        aria-label="Lọc theo trạng thái đọc"
                    >
                        <option value="ALL">Tất cả</option>
                        <option value="UNREAD">Chưa đọc</option>
                    </select>
                    <div className="adm-toolbar-right">
                        <span className="adm-count">
                            <Filter size={13} style={{ verticalAlign: -2 }} /> {filtered.length} kết quả
                        </span>
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <EmptyState
                        icon={<Bell size={22} />}
                        title="Không có thông báo"
                        description="Không có thông báo nào khớp với điều kiện đang lọc."
                    />
                ) : (
                    <ul className="adm-list">
                        {filtered.map((notification) => {
                            const scope = scopeMeta[notification.scope];
                            return (
                                <li className="adm-list-item" key={notification.id} style={{ alignItems: 'flex-start' }}>
                                    <span
                                        className={`adm-list-icon ${notification.isRead ? '' : 'is-warning'}`}
                                        style={{ marginTop: 2 }}
                                    >
                                        <Bell size={16} />
                                    </span>
                                    <div className="adm-list-text">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                            <strong>{notification.title}</strong>
                                            {!notification.isRead && <Badge label="Mới" tone="warning" />}
                                        </div>
                                        <p style={{ fontSize: 11.5, color: 'var(--adm-muted)', marginTop: 4, lineHeight: 1.6 }}>
                                            {notification.body}
                                        </p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 6 }}>
                                            <Badge label={scope.label} tone={scope.tone} />
                                            <small style={{ fontSize: 10.5, color: 'var(--adm-faint)' }} title={formatDateTime(notification.createdAt)}>
                                                {formatRelativeTime(notification.createdAt)}
                                            </small>
                                        </div>
                                    </div>
                                    <button
                                        className="adm-btn adm-btn-sm adm-btn-icon"
                                        onClick={() => toggleRead(notification.id)}
                                        aria-label={notification.isRead ? `Đánh dấu chưa đọc: ${notification.title}` : `Đánh dấu đã đọc: ${notification.title}`}
                                    >
                                        <Check size={14} />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Card>
        </>
    );
}
