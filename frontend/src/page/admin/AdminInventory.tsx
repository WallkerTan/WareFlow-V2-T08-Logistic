import { useMemo, useState } from 'react';
import { Check, ClipboardList, Download, Info, Plus, Search, ShieldAlert, Trash2 } from 'lucide-react';
import { Badge, Card, EmptyState, Modal, Pagination } from '../../components/admin/AdminUI';
import { stockDocuments as seedStockDocuments } from '../../data/adminData';
import type { StockDocument, StockDocumentStatus } from '../../types/admin';
import { formatDate, stockDocumentStatusMeta, stockDocumentTypeMeta } from '../../utils/format';

const PAGE_SIZE = 6;

export default function AdminInventory() {
    const [rows, setRows] = useState<StockDocument[]>(seedStockDocuments);
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | StockDocumentStatus>('ALL');
    const [page, setPage] = useState(1);
    const [selectedDoc, setSelectedDoc] = useState<StockDocument | null>(null);
    const [editForm, setEditForm] = useState<{
        partner: string;
        warehouseName: string;
        itemCount: number;
        status: StockDocumentStatus;
    }>({
        partner: '',
        warehouseName: '',
        itemCount: 0,
        status: 'DRAFT',
    });
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const openDocDetail = (doc: StockDocument) => {
        setSelectedDoc(doc);
        setEditForm({
            partner: doc.partner,
            warehouseName: doc.warehouseName,
            itemCount: doc.itemCount,
            status: doc.status,
        });
        setConfirmDelete(false);
    };

    const handleSaveDoc = () => {
        if (!selectedDoc) return;
        setRows((prev) =>
            prev.map((d) =>
                d.id === selectedDoc.id
                    ? {
                          ...d,
                          ...editForm,
                      }
                    : d
            )
        );
        setSelectedDoc(null);
        showToast(`Đã lưu thay đổi cho chứng từ kho ${selectedDoc.code}.`);
    };

    const handleQuickApprove = () => {
        if (!selectedDoc) return;
        setRows((prev) =>
            prev.map((d) => (d.id === selectedDoc.id ? { ...d, status: 'DONE' } : d))
        );
        setSelectedDoc(null);
        showToast(`Đã duyệt và hoàn tất chứng từ ${selectedDoc.code}.`);
    };

    const handleDeleteDoc = () => {
        if (!selectedDoc) return;
        if (selectedDoc.status === 'DONE' || selectedDoc.status === 'APPROVED') {
            alert('Ràng buộc CSDL: Phiếu kho đã ghi sổ và biến động tồn kho, không thể xóa!');
            return;
        }
        setRows((prev) => prev.filter((d) => d.id !== selectedDoc.id));
        const code = selectedDoc.code;
        setSelectedDoc(null);
        showToast(`Đã hủy/xóa chứng từ ${code}.`);
    };

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3500);
    };

    const filtered = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        return rows.filter((document) => {
            const matchesQuery =
                !keyword ||
                document.code.toLowerCase().includes(keyword) ||
                document.partner.toLowerCase().includes(keyword) ||
                document.warehouseName.toLowerCase().includes(keyword);
            const matchesStatus = statusFilter === 'ALL' || document.status === statusFilter;
            return matchesQuery && matchesStatus;
        });
    }, [rows, query, statusFilter]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, pageCount);
    const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    function updateFilter<T>(setter: (value: T) => void) {
        return (value: T) => {
            setter(value);
            setPage(1);
        };
    }

    const pendingCount = rows.filter((document) => document.status === 'PENDING_APPROVAL').length;

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
                    <div className="adm-stat-value">{rows.length}</div>
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
                        {rows.filter((document) => document.status === 'DONE').length}
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
                                        <tr
                                            key={document.id}
                                            onClick={() => openDocDetail(document)}
                                            title="Nhấp để xem chi tiết & cập nhật phiếu kho"
                                        >
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

            {selectedDoc && (
                <Modal
                    title={`Chứng từ kho: ${selectedDoc.code}`}
                    description={`ID: ${selectedDoc.id} · inventory-service: stock_documents`}
                    onClose={() => setSelectedDoc(null)}
                    footer={
                        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                {selectedDoc.status === 'DONE' || selectedDoc.status === 'APPROVED' ? (
                                    <span style={{ fontSize: 11, color: '#6b7280', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <ShieldAlert size={14} color="#10b981" /> Đã hoàn tất ghi sổ tồn kho
                                    </span>
                                ) : confirmDelete ? (
                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                        <span style={{ fontSize: 12, color: '#ef4444' }}>Hủy chứng từ này?</span>
                                        <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={handleDeleteDoc}>
                                            Hủy / Xóa
                                        </button>
                                        <button className="adm-btn adm-btn-sm" onClick={() => setConfirmDelete(false)}>
                                            Không
                                        </button>
                                    </div>
                                ) : (
                                    <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => setConfirmDelete(true)}>
                                        <Trash2 size={14} /> Hủy chứng từ
                                    </button>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="adm-btn" onClick={() => setSelectedDoc(null)}>
                                    Hủy
                                </button>
                                {selectedDoc.status !== 'DONE' && (
                                    <button className="adm-btn adm-btn-primary" onClick={handleSaveDoc}>
                                        <Check size={14} /> Lưu thay đổi
                                    </button>
                                )}
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
                                <strong>Ràng buộc quản lý kho (inventory-service: stock_documents):</strong>
                                <p style={{ margin: '4px 0 0' }}>
                                    Phiếu kho phát sinh từ kho <b>{selectedDoc.warehouseName}</b>. Khi phiếu chuyển trạng thái 'Hoàn tất' (DONE), hệ thống sẽ tự động cập nhật số lượng tồn vào <code>stock_lots</code> và ghi nhật ký <code>stock_movements</code>. Phiếu đã hoàn tất là bất biến.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Quick approval action */}
                    {(selectedDoc.status === 'PENDING_APPROVAL' || selectedDoc.status === 'DRAFT') && (
                        <div
                            style={{
                                padding: '12px 14px',
                                borderRadius: 8,
                                marginBottom: 16,
                                background: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <div>
                                <strong style={{ color: '#166534', fontSize: 13 }}>Phê duyệt & Xuất/Nhập kho:</strong>
                                <p style={{ margin: 0, fontSize: 12, color: '#15803d' }}>
                                    Xác nhận ghi sổ phiếu kho này để cập nhật tồn thực tế.
                                </p>
                            </div>
                            <button
                                className="adm-btn adm-btn-sm"
                                style={{ background: '#16a34a', color: '#fff', borderColor: '#16a34a' }}
                                onClick={handleQuickApprove}
                            >
                                <Check size={13} /> Duyệt phiếu ngay
                            </button>
                        </div>
                    )}

                    <div className="adm-form">
                        <div className="adm-field-grid">
                            <div className="adm-field">
                                <label>Mã phiếu kho (Code)</label>
                                <input
                                    className="adm-input"
                                    value={selectedDoc.code}
                                    disabled
                                    style={{ background: '#f8fafc', cursor: 'not-allowed', fontFamily: 'monospace' }}
                                />
                            </div>
                            <div className="adm-field">
                                <label>Loại chứng từ</label>
                                <input
                                    className="adm-input"
                                    value={stockDocumentTypeMeta[selectedDoc.type].label}
                                    disabled
                                    style={{ background: '#f8fafc', cursor: 'not-allowed' }}
                                />
                            </div>
                        </div>
                        <div className="adm-field-grid">
                            <div className="adm-field">
                                <label>Kho thực hiện</label>
                                <input
                                    className="adm-input"
                                    value={editForm.warehouseName}
                                    disabled={selectedDoc.status === 'DONE'}
                                    onChange={(e) => setEditForm({ ...editForm, warehouseName: e.target.value })}
                                />
                            </div>
                            <div className="adm-field">
                                <label>Đối tác / Khách hàng</label>
                                <input
                                    className="adm-input"
                                    value={editForm.partner}
                                    disabled={selectedDoc.status === 'DONE'}
                                    onChange={(e) => setEditForm({ ...editForm, partner: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="adm-field-grid">
                            <div className="adm-field">
                                <label>Số lượng mục hàng</label>
                                <input
                                    className="adm-input"
                                    type="number"
                                    value={editForm.itemCount}
                                    disabled={selectedDoc.status === 'DONE'}
                                    onChange={(e) => setEditForm({ ...editForm, itemCount: Number(e.target.value) })}
                                />
                            </div>
                            <div className="adm-field">
                                <label>Trạng thái chứng từ</label>
                                <select
                                    className="adm-select"
                                    value={editForm.status}
                                    disabled={selectedDoc.status === 'DONE'}
                                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as StockDocumentStatus })}
                                >
                                    <option value="DRAFT">Bản nháp (DRAFT)</option>
                                    <option value="PENDING_APPROVAL">Chờ phê duyệt (PENDING_APPROVAL)</option>
                                    <option value="APPROVED">Đã phê duyệt (APPROVED)</option>
                                    <option value="DONE">Hoàn tất / Đã ghi sổ (DONE)</option>
                                    <option value="CANCELLED">Đã hủy (CANCELLED)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
}
