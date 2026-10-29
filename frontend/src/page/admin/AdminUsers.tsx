import { useMemo, useState } from 'react';
import { Download, KeyRound, Lock, Plus, Search, ShieldCheck, Unlock, UserCog, Users } from 'lucide-react';
import { Badge, Card, EmptyState, Pagination } from '../../components/admin/AdminUI';
import { users as seedUsers } from '../../data/adminData';
import type { AdminUser, UserRole, UserStatus } from '../../types/admin';
import { formatDate, formatRelativeTime, initials, userRoleMeta, userStatusMeta } from '../../utils/format';

const PAGE_SIZE = 6;

export default function AdminUsers() {
    const [rows] = useState<AdminUser[]>(seedUsers);
    const [query, setQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
    const [statusFilter, setStatusFilter] = useState<'ALL' | UserStatus>('ALL');
    const [page, setPage] = useState(1);

    const filtered = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        return rows.filter((user) => {
            const matchesQuery =
                !keyword ||
                user.fullName.toLowerCase().includes(keyword) ||
                user.email.toLowerCase().includes(keyword) ||
                user.companyName.toLowerCase().includes(keyword);
            const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
            const matchesStatus = statusFilter === 'ALL' || user.status === statusFilter;
            return matchesQuery && matchesRole && matchesStatus;
        });
    }, [rows, query, roleFilter, statusFilter]);

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
                    <h2>Quản lý người dùng</h2>
                    <p>Phân quyền truy cập, quản lý tài khoản và theo dõi hoạt động của thành viên trên toàn hệ thống.</p>
                </div>
                <div className="admin-page-actions">
                    <button className="adm-btn">
                        <Download size={15} /> Xuất CSV
                    </button>
                    <button className="adm-btn adm-btn-primary">
                        <Plus size={16} /> Thêm người dùng
                    </button>
                </div>
            </div>

            <div className="adm-stats">
                {(['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'WAREHOUSE_MANAGER'] as UserRole[]).map((role) => {
                    const meta = userRoleMeta[role];
                    const count = rows.filter((user) => user.role === role).length;
                    return (
                        <article className="adm-stat" key={role}>
                            <div className="adm-stat-top">
                                <span className="adm-stat-label">{meta.label}</span>
                                <span className={`adm-stat-icon ${role === 'SYSTEM_ADMIN' ? 'is-purple' : role === 'COMPANY_ADMIN' ? 'is-success' : ''}`}>
                                    {role === 'SYSTEM_ADMIN' ? <ShieldCheck size={17} /> : role === 'COMPANY_ADMIN' ? <UserCog size={17} /> : <Users size={17} />}
                                </span>
                            </div>
                            <div className="adm-stat-value">{count}</div>
                            <div className="adm-stat-foot">
                                <span>{Math.round((count / rows.length) * 100)}% tổng số tài khoản</span>
                            </div>
                        </article>
                    );
                })}
                <article className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">Đã khoá</span>
                        <span className="adm-stat-icon is-warning">
                            <Lock size={17} />
                        </span>
                    </div>
                    <div className="adm-stat-value">{rows.filter((user) => user.status === 'LOCKED').length}</div>
                    <div className="adm-stat-foot">
                        <span>Tài khoản bị tạm khoá</span>
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
                            placeholder="Tìm theo tên, email, công ty…"
                            value={query}
                            onChange={(event) => updateFilter(setQuery)(event.target.value)}
                            aria-label="Tìm kiếm người dùng"
                        />
                    </label>
                    <select
                        className="adm-select"
                        value={roleFilter}
                        onChange={(event) => updateFilter(setRoleFilter)(event.target.value as 'ALL' | UserRole)}
                        aria-label="Lọc theo vai trò"
                    >
                        <option value="ALL">Tất cả vai trò</option>
                        {Object.entries(userRoleMeta).map(([value, meta]) => (
                            <option key={value} value={value}>
                                {meta.label}
                            </option>
                        ))}
                    </select>
                    <select
                        className="adm-select"
                        value={statusFilter}
                        onChange={(event) => updateFilter(setStatusFilter)(event.target.value as 'ALL' | UserStatus)}
                        aria-label="Lọc theo trạng thái"
                    >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="ACTIVE">Hoạt động</option>
                        <option value="LOCKED">Đã khoá</option>
                    </select>
                    <div className="adm-toolbar-right">
                        <span className="adm-count">{filtered.length} tài khoản</span>
                    </div>
                </div>

                {visible.length === 0 ? (
                    <EmptyState
                        icon={<Users size={22} />}
                        title="Không tìm thấy người dùng"
                        description="Không có tài khoản nào khớp với điều kiện tìm kiếm hiện tại."
                    />
                ) : (
                    <div className="adm-table-wrap">
                        <table className="adm-table">
                            <thead>
                                <tr>
                                    <th>Thành viên</th>
                                    <th>Vai trò</th>
                                    <th>Công ty</th>
                                    <th>Trạng thái</th>
                                    <th>Hoạt động gần nhất</th>
                                    <th>Ngày tạo</th>
                                    <th className="adm-col-actions">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((user) => {
                                    const role = userRoleMeta[user.role];
                                    const status = userStatusMeta[user.status];
                                    return (
                                        <tr key={user.id}>
                                            <td>
                                                <div className="adm-user-cell">
                                                    <span className="admin-avatar admin-avatar-sm">{initials(user.fullName)}</span>
                                                    <div>
                                                        <strong>{user.fullName}</strong>
                                                        <small>{user.email}</small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <Badge label={role.label} tone={role.tone} />
                                            </td>
                                            <td>{user.companyName}</td>
                                            <td>
                                                <Badge label={status.label} tone={status.tone} />
                                            </td>
                                            <td className="adm-muted">{formatRelativeTime(user.lastActiveAt)}</td>
                                            <td className="adm-muted">{formatDate(user.createdAt)}</td>
                                            <td className="adm-col-actions">
                                                <div style={{ display: 'inline-flex', gap: 6 }}>
                                                    <button className="adm-btn adm-btn-sm adm-btn-icon" aria-label={`Đặt lại mật khẩu ${user.fullName}`}>
                                                        <KeyRound size={14} />
                                                    </button>
                                                    <button
                                                        className="adm-btn adm-btn-sm adm-btn-icon"
                                                        aria-label={user.status === 'LOCKED' ? `Mở khoá ${user.fullName}` : `Khoá ${user.fullName}`}
                                                    >
                                                        {user.status === 'LOCKED' ? <Unlock size={14} /> : <Lock size={14} />}
                                                    </button>
                                                </div>
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
