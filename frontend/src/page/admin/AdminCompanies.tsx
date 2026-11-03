import { useMemo, useState } from 'react';
import { Building2, Check, Download, Filter, Pencil, Plus, Search, ShieldAlert, Trash2, X } from 'lucide-react';
import { Badge, Card, EmptyState, Modal, Pagination } from '../../components/admin/AdminUI';
import { companies as seedCompanies } from '../../data/adminData';
import type { Company, CompanyBusinessModel, CompanyStatus } from '../../types/admin';
import {
    businessModelMeta,
    companyStatusMeta,
    formatDate,
    formatNumber,
    formatRelativeTime,
} from '../../utils/format';

const PAGE_SIZE = 6;

type FormValues = {
    name: string;
    taxCode: string;
    email: string;
    phone: string;
    address: string;
    businessModel: CompanyBusinessModel;
};

const emptyForm: FormValues = {
    name: '',
    taxCode: '',
    email: '',
    phone: '',
    address: '',
    businessModel: 'TECH',
};

export default function AdminCompanies() {
    const [rows, setRows] = useState<Company[]>(seedCompanies);
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | CompanyStatus>('ALL');
    const [modelFilter, setModelFilter] = useState<'ALL' | CompanyBusinessModel>('ALL');
    const [page, setPage] = useState(1);
    const [editing, setEditing] = useState<Company | null>(null);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState<FormValues>(emptyForm);
    const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
    const [confirmDelete, setConfirmDelete] = useState<Company | null>(null);

    const filtered = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        return rows.filter((company) => {
            const matchesQuery =
                !keyword ||
                company.name.toLowerCase().includes(keyword) ||
                company.taxCode.includes(keyword) ||
                company.email.toLowerCase().includes(keyword);
            const matchesStatus = statusFilter === 'ALL' || company.status === statusFilter;
            const matchesModel = modelFilter === 'ALL' || company.businessModel === modelFilter;
            return matchesQuery && matchesStatus && matchesModel;
        });
    }, [rows, query, statusFilter, modelFilter]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, pageCount);
    const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    function updateFilter<T>(setter: (value: T) => void) {
        return (value: T) => {
            setter(value);
            setPage(1);
        };
    }

    function openCreate() {
        setForm(emptyForm);
        setErrors({});
        setEditing(null);
        setCreating(true);
    }

    function openEdit(company: Company) {
        setForm({
            name: company.name,
            taxCode: company.taxCode,
            email: company.email,
            phone: company.phone,
            address: company.address,
            businessModel: company.businessModel,
        });
        setErrors({});
        setCreating(false);
        setEditing(company);
    }

    function closeModal() {
        setCreating(false);
        setEditing(null);
    }

    function validate(): boolean {
        const next: Partial<Record<keyof FormValues, string>> = {};
        if (!form.name.trim()) next.name = 'Vui lòng nhập tên công ty.';
        if (!/^\d{10}(-?\d{3})?$/.test(form.taxCode.replace(/-/g, ''))) next.taxCode = 'Mã số thuế gồm 10 hoặc 13 chữ số.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Email không hợp lệ.';
        if (form.phone.trim() && !/^(0\d{9}|\+84\d{9})$/.test(form.phone.replace(/[\s.-]/g, ''))) {
            next.phone = 'Số điện thoại Việt Nam không hợp lệ.';
        }
        setErrors(next);
        return Object.keys(next).length === 0;
    }

    function save() {
        if (!validate()) return;
        if (editing) {
            setRows((current) =>
                current.map((company) =>
                    company.id === editing.id
                        ? {
                              ...company,
                              name: form.name.trim(),
                              taxCode: form.taxCode.replace(/-/g, ''),
                              email: form.email.trim().toLowerCase(),
                              phone: form.phone.trim(),
                              address: form.address.trim(),
                              businessModel: form.businessModel,
                          }
                        : company,
                ),
            );
        } else {
            setRows((current) => [
                {
                    id: `cmp-${Date.now()}`,
                    name: form.name.trim(),
                    businessModel: form.businessModel,
                    status: 'PENDING',
                    taxCode: form.taxCode.replace(/-/g, ''),
                    email: form.email.trim().toLowerCase(),
                    phone: form.phone.trim(),
                    address: form.address.trim(),
                    memberCount: 1,
                    warehouseCount: 0,
                    createdAt: new Date().toISOString(),
                },
                ...current,
            ]);
        }
        closeModal();
    }

    function toggleStatus(company: Company) {
        const nextStatus: CompanyStatus = company.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
        setRows((current) => current.map((row) => (row.id === company.id ? { ...row, status: nextStatus } : row)));
    }

    function remove(company: Company) {
        setRows((current) => current.filter((row) => row.id !== company.id));
        setConfirmDelete(null);
    }

    return (
        <>
            <div className="admin-page-head">
                <div>
                    <h2>Quản lý công ty</h2>
                    <p>Duyệt đăng ký, theo dõi trạng thái và quản lý toàn bộ không gian làm việc trên nền tảng.</p>
                </div>
                <div className="admin-page-actions">
                    <button className="adm-btn">
                        <Download size={15} /> Xuất CSV
                    </button>
                    <button className="adm-btn adm-btn-primary" onClick={openCreate}>
                        <Plus size={16} /> Thêm công ty
                    </button>
                </div>
            </div>

            <div className="adm-stats">
                {(['ACTIVE', 'PENDING', 'LOCKED'] as CompanyStatus[]).map((status) => {
                    const meta = companyStatusMeta[status];
                    const count = rows.filter((company) => company.status === status).length;
                    return (
                        <article className="adm-stat" key={status}>
                            <div className="adm-stat-top">
                                <span className="adm-stat-label">{meta.label}</span>
                                <span className={`adm-stat-icon ${status === 'ACTIVE' ? 'is-success' : status === 'PENDING' ? 'is-warning' : ''}`}>
                                    {status === 'LOCKED' ? <ShieldAlert size={17} /> : <Building2 size={17} />}
                                </span>
                            </div>
                            <div className="adm-stat-value">{formatNumber(count)}</div>
                            <div className="adm-stat-foot">
                                <span>{rows.length > 0 ? Math.round((count / rows.length) * 100) : 0}% tổng số công ty</span>
                            </div>
                        </article>
                    );
                })}
                <article className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">Tổng thành viên</span>
                        <span className="adm-stat-icon is-purple">
                            <Check size={17} />
                        </span>
                    </div>
                    <div className="adm-stat-value">{formatNumber(rows.reduce((sum, company) => sum + company.memberCount, 0))}</div>
                    <div className="adm-stat-foot">
                        <span>Tính trên tất cả không gian làm việc</span>
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
                            placeholder="Tìm theo tên, mã số thuế, email…"
                            value={query}
                            onChange={(event) => updateFilter(setQuery)(event.target.value)}
                            aria-label="Tìm kiếm công ty"
                        />
                    </label>
                    <select
                        className="adm-select"
                        value={statusFilter}
                        onChange={(event) => updateFilter(setStatusFilter)(event.target.value as 'ALL' | CompanyStatus)}
                        aria-label="Lọc theo trạng thái"
                    >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="ACTIVE">Hoạt động</option>
                        <option value="PENDING">Chờ duyệt</option>
                        <option value="LOCKED">Đã khoá</option>
                    </select>
                    <select
                        className="adm-select"
                        value={modelFilter}
                        onChange={(event) => updateFilter(setModelFilter)(event.target.value as 'ALL' | CompanyBusinessModel)}
                        aria-label="Lọc theo mô hình kinh doanh"
                    >
                        <option value="ALL">Tất cả mô hình</option>
                        {Object.entries(businessModelMeta).map(([value, meta]) => (
                            <option key={value} value={value}>
                                {meta.label}
                            </option>
                        ))}
                    </select>
                    <div className="adm-toolbar-right">
                        <span className="adm-count">
                            <Filter size={13} style={{ verticalAlign: -2 }} /> {filtered.length} kết quả
                        </span>
                    </div>
                </div>

                {visible.length === 0 ? (
                    <EmptyState
                        icon={<Building2 size={22} />}
                        title="Không tìm thấy công ty nào"
                        description="Thử điều chỉnh từ khoá tìm kiếm hoặc bỏ bớt điều kiện lọc để xem thêm kết quả."
                    />
                ) : (
                    <div className="adm-table-wrap">
                        <table className="adm-table">
                            <thead>
                                <tr>
                                    <th>Công ty</th>
                                    <th>Mã số thuế</th>
                                    <th>Mô hình</th>
                                    <th>Thành viên</th>
                                    <th>Kho</th>
                                    <th>Trạng thái</th>
                                    <th>Ngày tạo</th>
                                    <th className="adm-col-actions">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((company) => {
                                    const status = companyStatusMeta[company.status];
                                    const model = businessModelMeta[company.businessModel];
                                    return (
                                        <tr key={company.id}>
                                            <td>
                                                <span className="adm-cell-main">{company.name}</span>
                                                <span className="adm-cell-sub">{company.email}</span>
                                            </td>
                                            <td className="adm-mono">{company.taxCode}</td>
                                            <td>
                                                <Badge label={model.label} tone={model.tone} />
                                            </td>
                                            <td>{formatNumber(company.memberCount)}</td>
                                            <td>{formatNumber(company.warehouseCount)}</td>
                                            <td>
                                                <Badge label={status.label} tone={status.tone} />
                                            </td>
                                            <td className="adm-muted" title={formatRelativeTime(company.createdAt)}>
                                                {formatDate(company.createdAt)}
                                            </td>
                                            <td className="adm-col-actions">
                                                <div style={{ display: 'inline-flex', gap: 6 }}>
                                                    <button className="adm-btn adm-btn-sm adm-btn-icon" onClick={() => openEdit(company)} aria-label={`Sửa ${company.name}`}>
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        className="adm-btn adm-btn-sm adm-btn-icon"
                                                        onClick={() => toggleStatus(company)}
                                                        aria-label={company.status === 'LOCKED' ? `Mở khoá ${company.name}` : `Khoá ${company.name}`}
                                                    >
                                                        {company.status === 'LOCKED' ? <Check size={14} /> : <ShieldAlert size={14} />}
                                                    </button>
                                                    <button
                                                        className="adm-btn adm-btn-sm adm-btn-icon"
                                                        onClick={() => setConfirmDelete(company)}
                                                        aria-label={`Xoá ${company.name}`}
                                                    >
                                                        <Trash2 size={14} />
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

            {(creating || editing) && (
                <Modal
                    title={editing ? 'Cập nhật công ty' : 'Thêm doanh nghiệp mới'}
                    description={editing ? `Chỉnh sửa thông tin của ${editing.name}.` : 'Tạo không gian làm việc cho một doanh nghiệp mới.'}
                    onClose={closeModal}
                    footer={
                        <>
                            <button className="adm-btn" onClick={closeModal}>
                                Huỷ
                            </button>
                            <button className="adm-btn adm-btn-primary" onClick={save}>
                                {editing ? 'Lưu thay đổi' : 'Tạo công ty'}
                            </button>
                        </>
                    }
                >
                    <div className="adm-form">
                        <div className="adm-field">
                            <label htmlFor="company-name">
                                Tên công ty <span>*</span>
                            </label>
                            <input
                                id="company-name"
                                className="adm-input"
                                value={form.name}
                                onChange={(event) => setForm({ ...form, name: event.target.value })}
                                placeholder="Công ty TNHH …"
                            />
                            {errors.name && <span className="adm-field-error">{errors.name}</span>}
                        </div>
                        <div className="adm-field-grid">
                            <div className="adm-field">
                                <label htmlFor="company-tax">
                                    Mã số thuế <span>*</span>
                                </label>
                                <input
                                    id="company-tax"
                                    className="adm-input"
                                    value={form.taxCode}
                                    onChange={(event) => setForm({ ...form, taxCode: event.target.value })}
                                    placeholder="0123456789"
                                />
                                {errors.taxCode && <span className="adm-field-error">{errors.taxCode}</span>}
                            </div>
                            <div className="adm-field">
                                <label htmlFor="company-model">Mô hình kinh doanh</label>
                                <select
                                    id="company-model"
                                    className="adm-select"
                                    value={form.businessModel}
                                    onChange={(event) => setForm({ ...form, businessModel: event.target.value as CompanyBusinessModel })}
                                >
                                    {Object.entries(businessModelMeta).map(([value, meta]) => (
                                        <option key={value} value={value}>
                                            {meta.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="adm-field-grid">
                            <div className="adm-field">
                                <label htmlFor="company-email">
                                    Email quản trị <span>*</span>
                                </label>
                                <input
                                    id="company-email"
                                    className="adm-input"
                                    type="email"
                                    value={form.email}
                                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                                    placeholder="admin@congty.vn"
                                />
                                {errors.email && <span className="adm-field-error">{errors.email}</span>}
                            </div>
                            <div className="adm-field">
                                <label htmlFor="company-phone">Điện thoại</label>
                                <input
                                    id="company-phone"
                                    className="adm-input"
                                    value={form.phone}
                                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                                    placeholder="0901234567"
                                />
                                {errors.phone && <span className="adm-field-error">{errors.phone}</span>}
                            </div>
                        </div>
                        <div className="adm-field">
                            <label htmlFor="company-address">Địa chỉ</label>
                            <input
                                id="company-address"
                                className="adm-input"
                                value={form.address}
                                onChange={(event) => setForm({ ...form, address: event.target.value })}
                                placeholder="Địa chỉ trụ sở công ty"
                            />
                        </div>
                    </div>
                </Modal>
            )}

            {confirmDelete && (
                <Modal
                    title="Xoá doanh nghiệp"
                    description="Thao tác này không thể hoàn tác."
                    onClose={() => setConfirmDelete(null)}
                    footer={
                        <>
                            <button className="adm-btn" onClick={() => setConfirmDelete(null)}>
                                Huỷ
                            </button>
                            <button className="adm-btn adm-btn-danger" onClick={() => remove(confirmDelete)}>
                                <Trash2 size={15} /> Xoá vĩnh viễn
                            </button>
                        </>
                    }
                >
                    <div className="adm-inline-note is-danger">
                        <X size={15} />
                        <span>
                            Bạn sắp xoá <strong>{confirmDelete.name}</strong> cùng toàn bộ dữ liệu kho hàng, người dùng và giao dịch
                            liên quan. Hành động này không thể hoàn tác.
                        </span>
                    </div>
                </Modal>
            )}
        </>
    );
}
