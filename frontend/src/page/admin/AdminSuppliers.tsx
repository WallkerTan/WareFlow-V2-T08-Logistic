import { useMemo, useState } from 'react';
import { Check, Download, Info, Mail, Phone, Plus, Search, ShieldAlert, Trash2, Truck } from 'lucide-react';
import { Card, EmptyState, Modal, Pagination } from '../../components/admin/AdminUI';
import { suppliers as seedSuppliers } from '../../data/adminData';
import type { Supplier } from '../../types/admin';
import { formatDate, formatNumber } from '../../utils/format';

const PAGE_SIZE = 6;

export default function AdminSuppliers() {
    const [rows, setRows] = useState<Supplier[]>(seedSuppliers);
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [editForm, setEditForm] = useState<{
        name: string;
        category: string;
        companyName: string;
        contactPerson: string;
        phone: string;
        email: string;
    }>({
        name: '',
        category: '',
        companyName: '',
        contactPerson: '',
        phone: '',
        email: '',
    });
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const openSupplierDetail = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setEditForm({
            name: supplier.name,
            category: supplier.category,
            companyName: supplier.companyName,
            contactPerson: supplier.contactPerson,
            phone: supplier.phone,
            email: supplier.email,
        });
        setConfirmDelete(false);
    };

    const handleSaveSupplier = () => {
        if (!selectedSupplier) return;
        setRows((prev) =>
            prev.map((s) =>
                s.id === selectedSupplier.id
                    ? {
                          ...s,
                          ...editForm,
                      }
                    : s
            )
        );
        setSelectedSupplier(null);
        showToast(`Đã lưu thay đổi cho nhà cung cấp "${editForm.name}".`);
    };

    const handleDeleteSupplier = () => {
        if (!selectedSupplier) return;
        if (selectedSupplier.productCount > 0) {
            alert('Ràng buộc CSDL: Nhà cung cấp đang liên kết sản phẩm, không thể xóa trực tiếp!');
            return;
        }
        setRows((prev) => prev.filter((s) => s.id !== selectedSupplier.id));
        const name = selectedSupplier.name;
        setSelectedSupplier(null);
        showToast(`Đã xóa nhà cung cấp "${name}" khỏi hệ thống.`);
    };

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3500);
    };

    const filtered = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        return rows.filter(
            (supplier) =>
                !keyword ||
                supplier.name.toLowerCase().includes(keyword) ||
                supplier.category.toLowerCase().includes(keyword) ||
                supplier.companyName.toLowerCase().includes(keyword),
        );
    }, [rows, query]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, pageCount);
    const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    function updateFilter<T>(setter: (value: T) => void) {
        return (value: T) => {
            setter(value);
            setPage(1);
        };
    }

    const categories = new Set(rows.map((supplier) => supplier.category)).size;

    return (
        <>
            <div className="admin-page-head">
                <div>
                    <h2>Nhà cung cấp</h2>
                    <p>Quản lý đối tác cung ứng, danh mục sản phẩm và thông tin liên hệ trên toàn hệ thống.</p>
                </div>
                <div className="admin-page-actions">
                    <button className="adm-btn">
                        <Download size={15} /> Xuất CSV
                    </button>
                    <button className="adm-btn adm-btn-primary">
                        <Plus size={16} /> Thêm nhà cung cấp
                    </button>
                </div>
            </div>

            <div className="adm-stats">
                <article className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">Tổng nhà cung cấp</span>
                        <span className="adm-stat-icon">
                            <Truck size={17} />
                        </span>
                    </div>
                    <div className="adm-stat-value">{rows.length}</div>
                    <div className="adm-stat-foot">
                        <span>Đang hoạt động trên nền tảng</span>
                    </div>
                </article>
                <article className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">Nhóm ngành hàng</span>
                        <span className="adm-stat-icon is-purple">
                            <Truck size={17} />
                        </span>
                    </div>
                    <div className="adm-stat-value">{categories}</div>
                    <div className="adm-stat-foot">
                        <span>Phân loại theo danh mục</span>
                    </div>
                </article>
                <article className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">Tổng sản phẩm</span>
                        <span className="adm-stat-icon is-success">
                            <Truck size={17} />
                        </span>
                    </div>
                    <div className="adm-stat-value">{formatNumber(rows.reduce((sum, supplier) => sum + supplier.productCount, 0))}</div>
                    <div className="adm-stat-foot">
                        <span>Đang được cung ứng</span>
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
                            placeholder="Tìm theo tên, ngành hàng, công ty…"
                            value={query}
                            onChange={(event) => updateFilter(setQuery)(event.target.value)}
                            aria-label="Tìm kiếm nhà cung cấp"
                        />
                    </label>
                    <div className="adm-toolbar-right">
                        <span className="adm-count">{filtered.length} đối tác</span>
                    </div>
                </div>

                {visible.length === 0 ? (
                    <EmptyState
                        icon={<Truck size={22} />}
                        title="Không tìm thấy nhà cung cấp"
                        description="Không có đối tác nào khớp với từ khoá tìm kiếm hiện tại."
                    />
                ) : (
                    <div className="adm-table-wrap">
                        <table className="adm-table">
                            <thead>
                                <tr>
                                    <th>Nhà cung cấp</th>
                                    <th>Ngành hàng</th>
                                    <th>Công ty liên kết</th>
                                    <th>Người liên hệ</th>
                                    <th>Liên hệ</th>
                                    <th className="adm-text-right">Sản phẩm</th>
                                    <th>Ngày tạo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((supplier) => (
                                    <tr
                                        key={supplier.id}
                                        onClick={() => openSupplierDetail(supplier)}
                                        title="Nhấp để xem chi tiết & chỉnh sửa"
                                    >
                                        <td className="adm-cell-main">{supplier.name}</td>
                                        <td>{supplier.category}</td>
                                        <td>{supplier.companyName}</td>
                                        <td>{supplier.contactPerson}</td>
                                        <td>
                                            <span className="adm-cell-sub" style={{ marginTop: 0 }}>
                                                <Phone size={11} style={{ verticalAlign: -1 }} /> {supplier.phone}
                                            </span>
                                            <span className="adm-cell-sub">
                                                <Mail size={11} style={{ verticalAlign: -1 }} /> {supplier.email}
                                            </span>
                                        </td>
                                        <td className="adm-text-right adm-cell-main">{formatNumber(supplier.productCount)}</td>
                                        <td className="adm-muted">{formatDate(supplier.createdAt)}</td>
                                    </tr>
                                ))}
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

            {selectedSupplier && (
                <Modal
                    title={`Hồ sơ nhà cung cấp: ${selectedSupplier.name}`}
                    description={`ID: ${selectedSupplier.id} · core-service: suppliers`}
                    onClose={() => setSelectedSupplier(null)}
                    footer={
                        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                {selectedSupplier.productCount > 0 ? (
                                    <span style={{ fontSize: 11, color: '#6b7280', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <ShieldAlert size={14} color="#f59e0b" /> Không thể xóa (Đang liên kết {selectedSupplier.productCount} sản phẩm)
                                    </span>
                                ) : confirmDelete ? (
                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                        <span style={{ fontSize: 12, color: '#ef4444' }}>Xác nhận xóa đối tác?</span>
                                        <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={handleDeleteSupplier}>
                                            Xóa vĩnh viễn
                                        </button>
                                        <button className="adm-btn adm-btn-sm" onClick={() => setConfirmDelete(false)}>
                                            Hủy
                                        </button>
                                    </div>
                                ) : (
                                    <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => setConfirmDelete(true)}>
                                        <Trash2 size={14} /> Xóa nhà cung cấp
                                    </button>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="adm-btn" onClick={() => setSelectedSupplier(null)}>
                                    Hủy
                                </button>
                                <button className="adm-btn adm-btn-primary" onClick={handleSaveSupplier}>
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
                                <strong>Ràng buộc quan hệ CSDL (core-service: suppliers):</strong>
                                <p style={{ margin: '4px 0 0' }}>
                                    Nhà cung cấp liên kết với công ty ({selectedSupplier.companyName}) qua <code>company_id</code> và cung ứng danh mục hàng hóa (<code>products: JSONB</code>).
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="adm-form">
                        <div className="adm-field">
                            <label>Tên nhà cung cấp / Doanh nghiệp</label>
                            <input
                                className="adm-input"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            />
                        </div>
                        <div className="adm-field-grid">
                            <div className="adm-field">
                                <label>Ngành hàng / Danh mục</label>
                                <input
                                    className="adm-input"
                                    value={editForm.category}
                                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                />
                            </div>
                            <div className="adm-field">
                                <label>Công ty đối tác</label>
                                <input
                                    className="adm-input"
                                    value={editForm.companyName}
                                    onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="adm-field">
                            <label>Người đại diện liên hệ</label>
                            <input
                                className="adm-input"
                                value={editForm.contactPerson}
                                onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
                            />
                        </div>
                        <div className="adm-field-grid">
                            <div className="adm-field">
                                <label>Số điện thoại</label>
                                <input
                                    className="adm-input"
                                    value={editForm.phone}
                                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                />
                            </div>
                            <div className="adm-field">
                                <label>Email liên hệ</label>
                                <input
                                    className="adm-input"
                                    type="email"
                                    value={editForm.email}
                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
}
