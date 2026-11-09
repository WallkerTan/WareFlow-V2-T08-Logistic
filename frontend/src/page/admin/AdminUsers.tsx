import { useMemo, useState } from 'react';
import { Check, Download, Info, KeyRound, Lock, Plus, Search, ShieldCheck, Trash2, Unlock, UserCog, Users } from 'lucide-react';
import { Badge, Card, EmptyState, Modal, Pagination } from '../../components/admin/AdminUI';
import { users as seedUsers } from '../../data/adminData';
import type { AdminUser, UserRole, UserStatus } from '../../types/admin';
import { formatDate, formatRelativeTime, initials, userRoleMeta, userStatusMeta } from '../../utils/format';

const PAGE_SIZE = 6;

export default function AdminUsers() {
    const [rows, setRows] = useState<AdminUser[]>(seedUsers);
    const [query, setQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
    const [statusFilter, setStatusFilter] = useState<'ALL' | UserStatus>('ALL');
    const [page, setPage] = useState(1);
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [editForm, setEditForm] = useState<{
        fullName: string;
        email: string;
        role: UserRole;
        status: UserStatus;
        companyName: string;
    }>({
        fullName: '',
        email: '',
        role: 'COMPANY_ADMIN',
        status: 'ACTIVE',
        companyName: '',
    });
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const openUserDetail = (user: AdminUser) => {
        setSelectedUser(user);
        setEditForm({
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            status: user.status,
            companyName: user.companyName,
        });
        setConfirmDelete(false);
    };

    const handleSaveUser = () => {
        if (!selectedUser) return;
        setRows((prev) =>
            prev.map((u) =>
                u.id === selectedUser.id
                    ? {
                          ...u,
                          fullName: editForm.fullName,
                          email: editForm.email,
                          role: editForm.role,
                          status: editForm.status,
                          companyName: editForm.companyName,
                      }
                    : u
            )
        );
        setSelectedUser(null);
        showToast(`Đã lưu thay đổi người dùng "${editForm.fullName}".`);
    };

    const handleDeleteUser = () => {
        if (!selectedUser) return;
        if (selectedUser.role === 'SYSTEM_ADMIN') {
            alert('Ràng buộc bảo mật: Không thể xóa tài khoản Quản trị hệ thống tối cao.');
            return;
        }
        setRows((prev) => prev.filter((u) => u.id !== selectedUser.id));
        const name = selectedUser.fullName;
        setSelectedUser(null);
        showToast(`Đã xóa tài khoản "${name}" khỏi hệ thống.`);
    };

    const toggleLock = (user: AdminUser, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const nextStatus: UserStatus = user.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
        setRows((prev) =>
            prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
        );
        if (selectedUser?.id === user.id) {
            setEditForm((f) => ({ ...f, status: nextStatus }));
        }
        showToast(
            nextStatus === 'LOCKED'
                ? `Đã khóa tài khoản "${user.fullName}".`
                : `Đã mở khóa tài khoản "${user.fullName}".`
        );
    };

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3500);
    };

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
                                        <tr
                                            key={user.id}
                                            onClick={() => openUserDetail(user)}
                                            title="Nhấp để xem chi tiết & chỉnh sửa"
                                        >
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
                                                    <button
                                                        className="adm-btn adm-btn-sm adm-btn-icon"
                                                        aria-label={`Đặt lại mật khẩu ${user.fullName}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            showToast(`Đã gửi liên kết đặt lại mật khẩu tới ${user.email}`);
                                                        }}
                                                    >
                                                        <KeyRound size={14} />
                                                    </button>
                                                    <button
                                                        className="adm-btn adm-btn-sm adm-btn-icon"
                                                        aria-label={user.status === 'LOCKED' ? `Mở khoá ${user.fullName}` : `Khoá ${user.fullName}`}
                                                        onClick={(e) => toggleLock(user, e)}
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

            {toast && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        zIndex: 99,
                        background: '#1f2937',
                        color: '#fff',
                        padding: '12px 20px',
                        borderRadius: 10,
                        fontSize: 13,
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                    }}
                >
                    <Check size={16} color="#10b981" />
                    <span>{toast}</span>
                </div>
            )}

            {selectedUser && (
                <Modal
                    title={`Hồ sơ tài khoản: ${selectedUser.fullName}`}
                    description={`ID: ${selectedUser.id} · core-service: users`}
                    onClose={() => setSelectedUser(null)}
                    footer={
                        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                {selectedUser.role === 'SYSTEM_ADMIN' ? (
                                    <span style={{ fontSize: 11, color: '#6b7280', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <ShieldCheck size={14} color="#6366f1" /> Không thể xóa Admin tối cao
                                    </span>
                                ) : confirmDelete ? (
                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                        <span style={{ fontSize: 12, color: '#ef4444' }}>Xác nhận xóa?</span>
                                        <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={handleDeleteUser}>
                                            Xóa vĩnh viễn
                                        </button>
                                        <button className="adm-btn adm-btn-sm" onClick={() => setConfirmDelete(false)}>
                                            Hủy
                                        </button>
                                    </div>
                                ) : (
                                    <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => setConfirmDelete(true)}>
                                        <Trash2 size={14} /> Xóa tài khoản
                                    </button>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="adm-btn" onClick={() => setSelectedUser(null)}>
                                    Hủy
                                </button>
                                <button className="adm-btn adm-btn-primary" onClick={handleSaveUser}>
                                    <Check size={14} /> Lưu thay đổi
                                </button>
                            </div>
                        </div>
                    }
                >
                    <div
                        style={{
                            padding: '12px 14px',
                            borderRadius: 8,
                            marginBottom: 16,
                            fontSize: 12.5,
                            lineHeight: 1.5,
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            color: '#334155',
                        }}
                    >
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <Info size={16} color="#3b82f6" style={{ flexShrink: 0, marginTop: 2 }} />
                            <div>
                                <strong>Ràng buộc quan hệ CSDL (core-service: users):</strong>
                                <p style={{ margin: '4px 0 0' }}>
                                    Tài khoản liên kết với công ty ({selectedUser.companyName}) qua <code>company_id</code>. Người dùng có phát sinh nhật ký thao tác kho (<code>system_logs</code>) không nên xóa vĩnh viễn để bảo tồn dữ liệu kiểm toán; hãy chuyển trạng thái sang <b>Đã khóa</b>.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="adm-form">
                        <div className="adm-field">
                            <label>Họ và tên</label>
                            <input
                                className="adm-input"
                                value={editForm.fullName}
                                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                            />
                        </div>
                        <div className="adm-field-grid">
                            <div className="adm-field">
                                <label>Email (Tên đăng nhập)</label>
                                <input
                                    className="adm-input"
                                    type="email"
                                    value={editForm.email}
                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                />
                            </div>
                            <div className="adm-field">
                                <label>Công ty trực thuộc</label>
                                <input
                                    className="adm-input"
                                    value={editForm.companyName}
                                    onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="adm-field-grid">
                            <div className="adm-field">
                                <label>Vai trò phân quyền</label>
                                <select
                                    className="adm-select"
                                    value={editForm.role}
                                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                                >
                                    <option value="SYSTEM_ADMIN">Quản trị hệ thống (System Admin)</option>
                                    <option value="COMPANY_ADMIN">Quản trị công ty (Company Admin)</option>
                                    <option value="WAREHOUSE_MANAGER">Quản lý kho (Warehouse Manager)</option>
                                </select>
                            </div>
                            <div className="adm-field">
                                <label>Trạng thái tài khoản</label>
                                <select
                                    className="adm-select"
                                    value={editForm.status}
                                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as UserStatus })}
                                >
                                    <option value="ACTIVE">Hoạt động (Active)</option>
                                    <option value="LOCKED">Đã khóa (Locked)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
}
