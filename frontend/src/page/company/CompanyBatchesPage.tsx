import { useState } from 'react';
import { useReduxFormState } from '../../store/useReduxFormState';
import { Plus, Boxes, Calendar, FileText, Search, Trash2 } from 'lucide-react';
import { useQuery, invalidateData } from '../../services/query';
import { request, mutate } from '../../services/api';
import { useAdminData } from '../../services/data';
import { usePurchaseBatchCatalog } from '../../services/purchaseBatchCatalog';
import { Modal } from '../../components/admin/AdminUI';
import { useWorkspace } from '../../services/workspace';
import { formatCurrency, formatDateTime } from '../../utils/format';
import toast from 'react-hot-toast';

type BatchLine = {
    supplierId: string;
    supplierName: string;
    productId: string;
    sku: string;
    name: string;
    unit: string;
    barcode: string;
    quantity: number;
    price: number;
    amount: number;
};

type PurchaseBatch = {
    id: string;
    code: string;
    companyId: string;
    createdAt: string;
    total: number;
    lines: BatchLine[];
};

type DraftLine = {
    key: string;
    supplierId: string;
    productId: string;
    quantity: string;
};

export default function CompanyBatchesPage() {
    const batchesQuery = useQuery<PurchaseBatch[]>('purchase-batches', () =>
        request<PurchaseBatch[]>('core', '/purchase-batches')
    );
    const { raw } = useAdminData('products');
    const catalog = usePurchaseBatchCatalog();
    const { warehouseId, warehouse } = useWorkspace();
    const [search, setSearch] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [selectedSupplierId, setSelectedSupplierId] = useReduxFormState('');
    const [draftLines, setDraftLines] = useReduxFormState<DraftLine[]>([
        { key: 'init-1', supplierId: '', productId: '', quantity: '1' }
    ]);

    const batches = batchesQuery.data || [];
    const filteredBatches = batches.filter(b => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
            b.code.toLowerCase().includes(q) ||
            b.lines?.some(l =>
                l.sku.toLowerCase().includes(q) ||
                l.name.toLowerCase().includes(q) ||
                l.supplierName.toLowerCase().includes(q)
            )
        );
    });

    const totalBatchValue = batches.reduce((sum, b) => sum + Number(b.total || 0), 0);

    const suppliers = catalog.data?.suppliers ?? [];
    const supplierProducts = catalog.data?.products ?? [];

    const addDraftLine = () => {
        setDraftLines(prev => [
            ...prev,
            { key: 'line-' + Date.now() + Math.random(), supplierId: '', productId: '', quantity: '1' }
        ]);
    };

    const removeDraftLine = (index: number) => {
        setDraftLines(prev => prev.filter((_, i) => i !== index));
    };

    const updateDraftLine = (index: number, key: keyof DraftLine, val: string) => {
        setDraftLines(prev => prev.map((l, i) => {
            if (i !== index) return l;
            const updated = { ...l, [key]: val };
            if (key === 'supplierId') {
                updated.productId = '';
            }
            return updated;
        }));
    };

    const handleOpenCreate = () => {
        setSelectedSupplierId('');
        setDraftLines([
            { key: 'init-' + Date.now(), supplierId: '', productId: '', quantity: '1' }
        ]);
        setError('');
        setIsCreating(true);
    };

    const handleCreateBatch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (busy) return;
        if (!draftLines.length) {
            toast.error('Cần ít nhất một dòng hàng trong lô');
            return;
        }

        for (let i = 0; i < draftLines.length; i++) {
            const line = draftLines[i];
            const supId = line.supplierId || selectedSupplierId;
            if (!supId) {
                toast.error(`Dòng ${i + 1}: Vui lòng chọn nhà cung cấp`);
                return;
            }
            if (!supplierProducts.some(product => String(product.id) === line.productId
                && String(product.supplierId) === supId)) {
                toast.error(`Dòng ${i + 1}: Vui lòng chọn sản phẩm`);
                return;
            }
            if (!line.quantity || Number(line.quantity) <= 0) {
                toast.error(`Dòng ${i + 1}: Số lượng phải lớn hơn 0`);
                return;
            }
        }

        setError('');
        setBusy(true);
        try {
            const payload = {
                lines: draftLines.map(l => ({
                    supplierId: l.supplierId || selectedSupplierId,
                    productId: l.productId,
                    quantity: Number(l.quantity)
                }))
            };
            const created = await mutate<PurchaseBatch>('core', '/purchase-batches', 'POST', payload);
            toast.success(`Đã tạo lô hàng thành công: ${created.code}`);
            invalidateData();
            batchesQuery.reload();
            setIsCreating(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không tạo được lô hàng');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
            {/* Header */}
            <div className="admin-page-head">
                <div>
                    <span className="workspace-eyebrow">WAREFLOW / QUẢN LÝ LÔ HÀNG</span>
                    <h2>Danh sách lô hàng</h2>
                    <p>Mỗi lô hàng được đánh mã riêng biệt tự động theo quy chuẩn và hiển thị chi tiết theo từng bảng.</p>
                </div>
                <button className="adm-btn adm-btn-primary" onClick={handleOpenCreate}>
                    <Plus size={16} /> Thêm lô hàng mới
                </button>
            </div>

            {/* Quick summary stats */}
            <div className="adm-stats" style={{ marginBottom: 20 }}>
                <div className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">Tổng số lô hàng</span>
                        <span className="adm-stat-icon is-purple"><Boxes size={18} /></span>
                    </div>
                    <div className="adm-stat-value">{batches.length}</div>
                    <div className="adm-stat-foot"><span>Lô hàng đã tạo</span></div>
                </div>
                <div className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">Tổng giá trị các lô</span>
                        <span className="adm-stat-icon is-warning"><FileText size={18} /></span>
                    </div>
                    <div className="adm-stat-value">{formatCurrency(totalBatchValue)}</div>
                    <div className="adm-stat-foot"><span>Giá trị niêm yết theo lô</span></div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="workspace-toolbar" style={{ marginBottom: 20 }}>
                <label>
                    <Search size={16} />
                    <input
                        placeholder="Tìm theo mã lô (LH...), mã SKU, tên sản phẩm hoặc nhà cung cấp…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </label>
                <span>{filteredBatches.length} lô hàng</span>
            </div>

            {/* List of Batches: Each batch is rendered as a standalone table */}
            {batchesQuery.loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                    Đang tải dữ liệu lô hàng…
                </div>
            ) : batchesQuery.error ? (
                <div className="wf-card wf-operation-stack" role="alert">
                    <p>{batchesQuery.error}</p>
                    <div className="wf-operation-actions">
                        <button type="button" className="adm-btn" onClick={batchesQuery.reload}>Thử lại</button>
                    </div>
                </div>
            ) : filteredBatches.length === 0 ? (
                <div className="wf-card" style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
                    <Boxes size={48} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#334155' }}>Chưa có lô hàng nào</h3>
                    <p style={{ fontSize: 13, marginTop: 4 }}>Bấm nút "Thêm lô hàng mới" ở trên để tạo lô hàng đầu tiên với mã tự động (LH...).</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {filteredBatches.map(batch => {
                        const lines = batch.lines || [];
                        return (
                            <div key={batch.id} className="wf-card" style={{ padding: 0, overflow: 'hidden' }}>
                                {/* Batch Header Bar */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: 12,
                                    padding: '16px 20px',
                                    background: '#f8fafc',
                                    borderBottom: '1px solid #e2e8f0'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <span style={{
                                            display: 'inline-block',
                                            padding: '4px 10px',
                                            borderRadius: 6,
                                            background: '#318269',
                                            color: '#ffffff',
                                            fontWeight: 700,
                                            fontSize: 14,
                                            letterSpacing: '0.04em'
                                        }}>
                                            {batch.code}
                                        </span>
                                        <div style={{ fontSize: 13, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Calendar size={14} />
                                            <span>Ngày tạo: {formatDateTime(batch.createdAt)}</span>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                                        Tổng tiền lô: <span style={{ color: '#0f766e', fontSize: 16, fontWeight: 700 }}>{formatCurrency(batch.total)}</span>
                                    </div>
                                </div>

                                {/* Batch Table */}
                                <div className="workspace-table">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th style={{ width: 60, textAlign: 'center' }}>Dòng</th>
                                                <th>Nhà cung cấp</th>
                                                <th>Mã SKU</th>
                                                <th>Tên mặt hàng</th>
                                                <th style={{ textAlign: 'center' }}>ĐVT</th>
                                                <th style={{ textAlign: 'right' }}>Số lượng</th>
                                                <th style={{ textAlign: 'right' }}>Đơn giá niêm yết</th>
                                                <th style={{ textAlign: 'right' }}>Thành tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lines.map((line, idx) => (
                                                <tr key={idx}>
                                                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b' }}>{idx + 1}</td>
                                                    <td style={{ fontWeight: 500 }}>{line.supplierName}</td>
                                                    <td>
                                                        <span style={{
                                                            fontFamily: 'monospace',
                                                            fontWeight: 600,
                                                            background: '#f1f5f9',
                                                            padding: '2px 6px',
                                                            borderRadius: 4
                                                        }}>
                                                            {line.sku}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontWeight: 600, color: '#1e293b' }}>{line.name}</td>
                                                    <td style={{ textAlign: 'center', color: '#64748b' }}>{line.unit || 'Cái'}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{Number(line.quantity).toLocaleString('vi-VN')}</td>
                                                    <td style={{ textAlign: 'right' }}>{formatCurrency(line.price)}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f766e' }}>{formatCurrency(line.amount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Batch Footer info */}
                                <div style={{
                                    padding: '10px 20px',
                                    background: '#ffffff',
                                    borderTop: '1px solid #f1f5f9',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: 12,
                                    color: '#64748b'
                                }}>
                                    <span>Bao gồm {lines.length} dòng sản phẩm</span>
                                    <span>Mã lô được tự động định danh theo công ty</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal: Tạo lô hàng mới */}
            {isCreating && (
                <Modal
                    title="Tạo lô hàng mới"
                    wide
                    onClose={() => { if (!busy) setIsCreating(false); }}
                >
                    <form onSubmit={handleCreateBatch}>
                        {catalog.loading && <p role="status">Đang tải danh mục nhà cung cấp…</p>}
                        {catalog.error && <p role="alert">{catalog.error} <button type="button" className="adm-btn" onClick={catalog.reload}>Thử lại</button></p>}
                        <fieldset className="wf-form-stack" disabled={busy}>
                        <div style={{ marginBottom: 16 }}>
                            <label className="wf-field">
                                <span>Nhà cung cấp chính</span>
                                <select
                                    value={selectedSupplierId}
                                    onChange={e => {
                                        const newSup = e.target.value;
                                        setSelectedSupplierId(newSup);
                                        if (newSup !== selectedSupplierId) {
                                            setDraftLines(lines => lines.map(line => line.supplierId
                                                ? line
                                                : { ...line, productId: '' }));
                                        }
                                    }}
                                >
                                    <option value="">-- Chọn nhà cung cấp --</option>
                                    {suppliers.map(s => (
                                        <option key={String(s.id)} value={String(s.id)}>{String(s.name)}</option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        {/* List of lines */}
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <strong style={{ fontSize: 14 }}>Các dòng hàng trong lô:</strong>
                                <button type="button" className="adm-btn" disabled={draftLines.length >= 100} onClick={addDraftLine}>
                                    <Plus size={14} /> Thêm dòng hàng
                                </button>
                            </div>

                            {draftLines.map((line, idx) => {
                                const currentSupId = line.supplierId || selectedSupplierId;
                                const filteredProducts = supplierProducts.filter(p => String(p.supplierId) === String(currentSupId));
                                const chosenProduct = filteredProducts.find(p => String(p.id) === String(line.productId));
                                const linePrice = Number(chosenProduct?.price || 0);
                                const lineQty = Number(line.quantity || 0);
                                const lineTotal = linePrice * lineQty;
                                const stock = chosenProduct && raw.products.find(item => item.warehouseId === warehouseId
                                    && (item.sku === chosenProduct.sku || item.sku === chosenProduct.legacySku));
                                const lowStock = stock && Number(stock.available ?? stock.quantity) < Number(stock.minStock);

                                return (
                                    <div key={line.key} style={{
                                        background: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: 8,
                                        padding: 12,
                                        marginBottom: 10
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <span style={{ fontWeight: 600, fontSize: 13, color: '#334155' }}>Dòng hàng #{idx + 1}</span>
                                            {draftLines.length > 1 && (
                                                <button
                                                    type="button"
                                                    style={{ border: 0, background: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                                                    onClick={() => removeDraftLine(idx)}
                                                    title="Xóa dòng"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(170px, 100%), 1fr))', gap: 16 }}>
                                            <label className="wf-field" style={{ margin: 0 }}>
                                                <span>Nhà cung cấp *</span>
                                                <select
                                                    value={line.supplierId}
                                                    required={!selectedSupplierId}
                                                    onChange={e => updateDraftLine(idx, 'supplierId', e.target.value)}
                                                >
                                                    <option value="">{selectedSupplierId ? 'Dùng nhà cung cấp chính' : 'Chọn NCC'}</option>
                                                    {suppliers.map(s => (
                                                        <option key={String(s.id)} value={String(s.id)}>{String(s.name)}</option>
                                                    ))}
                                                </select>
                                            </label>

                                            <label className="wf-field" style={{ margin: 0 }}>
                                                <span>Sản phẩm *</span>
                                                <select
                                                    value={line.productId}
                                                    required
                                                    disabled={!currentSupId}
                                                    onChange={e => updateDraftLine(idx, 'productId', e.target.value)}
                                                >
                                                    <option value="">{currentSupId && filteredProducts.length === 0
                                                        ? 'Không có sản phẩm khả dụng'
                                                        : '-- Chọn sản phẩm --'}</option>
                                                    {filteredProducts.map(p => (
                                                        <option key={String(p.id)} value={String(p.id)}>
                                                            {String(p.sku)} · {String(p.name)} ({formatCurrency(Number(p.price || 0))})
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>

                                            <label className="wf-field" style={{ margin: 0 }}>
                                                <span>Số lượng *</span>
                                                <input
                                                    type="number"
                                                    min="0.01"
                                                    step="0.01"
                                                    required
                                                    value={line.quantity}
                                                    onChange={e => updateDraftLine(idx, 'quantity', e.target.value)}
                                                />
                                            </label>
                                        </div>

                                        {chosenProduct && (
                                            <div style={{
                                                marginTop: 8,
                                                paddingTop: 8,
                                                borderTop: '1px dashed #cbd5e1',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                flexWrap: 'wrap',
                                                gap: 8,
                                                fontSize: 12,
                                                color: '#475569'
                                            }}>
                                                <span>SKU: <strong>{String(chosenProduct.sku)}</strong> · ĐVT: <strong>{String(chosenProduct.unit || 'Cái')}</strong> · Đơn giá: <strong>{formatCurrency(linePrice)}</strong></span>
                                                <span style={{ color: '#0f766e', fontWeight: 700 }}>Thành tiền: {formatCurrency(lineTotal)}</span>
                                            </div>
                                        )}
                                        {lowStock && <p className="wf-notice" style={{ marginTop: 12 }}>
                                            Tồn khả dụng tại {String(warehouse?.name || 'kho đang chọn')} thấp hơn mức tối thiểu.
                                        </p>}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Total calculation */}
                        {(() => {
                            const sum = draftLines.reduce((acc, line) => {
                                const currentSupId = line.supplierId || selectedSupplierId;
                                const prod = supplierProducts.find(p => String(p.id) === String(line.productId) && String(p.supplierId) === String(currentSupId));
                                return acc + (Number(prod?.price || 0) * Number(line.quantity || 0));
                            }, 0);
                            return (
                                <div style={{
                                    padding: '12px 16px',
                                    background: '#f0fdf4',
                                    border: '1px solid #bbf7d0',
                                    borderRadius: 8,
                                    marginBottom: 16,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span style={{ color: '#166534', fontWeight: 600 }}>Tổng tiền dự kiến cả lô:</span>
                                    <strong style={{ fontSize: 18, color: '#15803d' }}>{formatCurrency(sum)}</strong>
                                </div>
                            );
                        })()}

                        {error && <p className="wf-notice" role="alert">{error}</p>}
                        <div className="wf-operation-actions">
                            <button type="button" className="adm-btn" onClick={() => setIsCreating(false)} disabled={busy}>
                                Đóng
                            </button>
                            <button type="submit" className="adm-btn adm-btn-primary" disabled={busy}>
                                {busy ? 'Đang tạo lô…' : 'Xác nhận tạo lô hàng'}
                            </button>
                        </div>
                        </fieldset>
                    </form>
                </Modal>
            )}
        </div>
    );
}
