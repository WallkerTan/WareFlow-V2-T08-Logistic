import { useState } from 'react';
import { useReduxFormState } from '../../store/useReduxFormState';
import { request } from '../../services/api';
import { saveResource, useAdminData } from '../../services/data';
import { getAuthSession } from '../../services/authApi';
import { useQuery } from '../../services/query';
import { useWorkspace } from '../../services/workspace';
import { formatCurrency, randomUUID } from '../../utils/format';
import { Badge, Modal } from '../admin/AdminUI';
import { AlertTriangle, PackagePlus } from 'lucide-react';
import toast from 'react-hot-toast';

type BatchLine = { sku: string; name: string; quantity?: number; price?: number };
type Batch = { id: string; code: string; lines: BatchLine[]; total: number };
type Order = {
    id: string;
    status: string;
    warehousePayment: boolean;
    total: number;
    batches: Batch[];
    createdAt?: string;
};

const statuses: Record<string, { label: string; tone: 'warning' | 'success' | 'danger' | 'info' }> = {
    PENDING: { label: 'Chờ duyệt', tone: 'warning' },
    PROCESSING: { label: 'Đang quyết toán', tone: 'info' },
    DONE: { label: 'Đã nhập kho', tone: 'success' },
    CANCELLED: { label: 'Đã hủy', tone: 'danger' },
};

export default function BatchImportPage() {
    const { warehouseId, warehouses, selectWarehouse } = useWorkspace();
    const session = getAuthSession();
    const manager = session?.role === 'WAREHOUSE_MANAGER';

    return (
        <section style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
            <div className="admin-page-head">
                <div>
                    <span className="workspace-eyebrow">WAREFLOW / NHẬP HÀNG</span>
                    <h2>Nhập hàng hóa theo lô</h2>
                    <p>
                        {manager
                            ? 'Chọn các lô hàng đã mua để gửi đề xuất nhập về kho quản lý. Kho chịu 5% phí dịch vụ sau khi được duyệt.'
                            : 'Chọn kho và các lô hàng để nhập hàng trực tiếp. Phí dịch vụ 5% tự động trích vào tài khoản quản trị hệ thống.'}
                    </p>
                </div>
            </div>

            <div className="wf-card" style={{ marginBottom: 20, padding: '16px 20px' }}>
                <label className="wf-field" style={{ margin: 0, maxWidth: 450 }}>
                    <span style={{ fontWeight: 600 }}>Kho nhận hàng *</span>
                    {manager ? (
                        <div style={{
                            padding: '8px 12px',
                            background: '#f1f5f9',
                            borderRadius: 6,
                            fontWeight: 600,
                            color: '#334155'
                        }}>
                            {String(warehouses.find(w => String(w.id) === String(warehouseId))?.name || 'Kho đang quản lý')} (Cố định theo quyền quản lý kho)
                        </div>
                    ) : (
                        <select
                            value={warehouseId}
                            onChange={e => selectWarehouse(e.target.value)}
                        >
                            <option value="">-- Chọn kho cần nhập --</option>
                            {warehouses.map(w => (
                                <option key={String(w.id)} value={String(w.id)}>{String(w.name)}</option>
                            ))}
                        </select>
                    )}
                </label>
            </div>

            {warehouseId ? (
                <ImportForm key={warehouseId} warehouse={warehouseId} manager={manager} />
            ) : (
                <div className="wf-card" style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                    Vui lòng chọn kho nhận hàng để xem danh sách lô khả dụng.
                </div>
            )}
        </section>
    );
}

function ImportForm({ warehouse, manager }: { warehouse: string; manager: boolean }) {
    const batches = useQuery<Batch[]>('purchase-batches', () => request<Batch[]>('core', '/purchase-batches'));
    const { raw } = useAdminData('products');
    const path = '/warehouses/' + warehouse + '/batch-imports';
    const orders = useQuery<Order[]>(path, () => request<Order[]>('inventory', path));
    const [creating, setCreating] = useState(false);
    const [decision, setDecision] = useState<{ order: Order; action: 'approve' | 'cancel' } | null>(null);
    const [selected, setSelected] = useReduxFormState<string[]>([]);
    const [requestId, setRequestId] = useReduxFormState(() => randomUUID());
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const reservations = useQuery<string[]>(path + '/reserved', () => request<string[]>('inventory', path + '/reserved'));
    const reserved = new Set(reservations.data || []);
    const available = (batches.data || []).filter(b => !reserved.has(b.id));
    const chosen = available.filter(b => selected.includes(b.id));
    const total = chosen.reduce((n, b) => n + Number(b.total || 0), 0);
    const fee = Math.round(total * 5) / 100;
    const grandTotal = total + fee;

    async function submit(action?: string) {
        if (busy) return;
        setBusy(true);
        setError('');
        try {
            await saveResource('inventory', path + (action || ''), 'POST', action ? undefined : { requestId, batchIds: chosen.map(b => b.id) });
            toast.success(action?.includes('approve') ? 'Đã duyệt và nhập kho thành công!' : action?.includes('cancel') ? 'Đã hủy yêu cầu' : 'Đã tạo yêu cầu nhập kho thành công!');
            setCreating(false);
            setDecision(null);
            setSelected([]);
            setRequestId(randomUUID());
            orders.reload();
            reservations.reload();
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Không thể cập nhật yêu cầu.';
            setError(msg);
            toast.error(msg);
            orders.reload();
            reservations.reload();
        } finally {
            setBusy(false);
        }
    }

    const warnings: { code: string; sku: string; warning: string }[] = [];
    chosen.forEach(b => {
        b.lines?.forEach(line => {
            const product = raw.products.find(p => p.warehouseId === warehouse && p.sku === line.sku);
            let w = '';
            if (!product) w = 'Chưa có sản phẩm tại kho nhận (sẽ tự động tạo mới khi nhập)';
            else if (Number(product.available ?? product.quantity) === 0) w = 'Hết tồn khả dụng';
            else if (Number(product.available ?? product.quantity) < Number(product.minStock)) w = 'Tồn khả dụng dưới mức tồn tối thiểu';
            if (w) warnings.push({ code: b.code, sku: line.sku, warning: w });
        });
    });

    return (
        <div className="wf-operation-stack">
            <div className="wf-operation-actions">
                <button type="button" className="adm-btn adm-btn-primary" onClick={() => { setError(''); setCreating(true); }}>
                    <PackagePlus size={16} /> {manager ? 'Tạo yêu cầu nhập' : 'Nhập lô hàng'}
                </button>
            </div>
            {creating && <Modal title={manager ? 'Tạo yêu cầu nhập kho' : 'Thanh toán và nhập kho'} wide onClose={() => { if (!busy) setCreating(false); }}>
            <fieldset disabled={busy} className="wf-form-stack">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#1e293b' }}>Chọn các lô hàng cần nhập</h3>
                        <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>Có thể tích chọn cùng lúc nhiều lô để nhập chung một đợt.</p>
                    </div>
                    {chosen.length > 0 && (
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#0f766e', background: '#f0fdf4', padding: '4px 10px', borderRadius: 6 }}>
                            Đã chọn {chosen.length} lô hàng
                        </span>
                    )}
                </div>

                {batches.error || reservations.error ? (
                    <div role="alert">
                        <p>Không tải được danh sách lô hàng. {batches.error || reservations.error}</p>
                        <button type="button" className="adm-btn" onClick={() => { batches.reload(); reservations.reload(); }}>Thử lại</button>
                    </div>
                ) : batches.loading || reservations.loading ? (
                    <p role="status">Đang tải danh sách lô hàng…</p>
                ) : available.length === 0 ? (
                    <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                        Không có lô hàng khả dụng nào để nhập (hoặc tất cả các lô đã được nhập / đang chờ duyệt).
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 16 }}>
                        {available.map(b => {
                            const isChecked = selected.includes(b.id);
                            return (
                                <label
                                    key={b.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        padding: '12px 14px',
                                        borderRadius: 8,
                                        border: isChecked ? '2px solid #318269' : '1px solid #e2e8f0',
                                        background: isChecked ? '#f0fdf4' : '#ffffff',
                                        cursor: 'pointer',
                                        transition: 'all .15s'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        style={{ width: 18, height: 18, accentColor: '#318269' }}
                                        onChange={e => {
                                            setSelected(e.target.checked ? [...selected, b.id] : selected.filter(id => id !== b.id));
                                            setRequestId(randomUUID());
                                        }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>{b.code}</div>
                                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{b.lines?.length || 0} dòng mặt hàng</div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f766e', marginTop: 4 }}>{formatCurrency(b.total)}</div>
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                )}

                {selected.length > 100 && <p role="alert">Mỗi yêu cầu được chọn tối đa 100 lô.</p>}

                {/* Stock warnings */}
                {warnings.length > 0 && (
                    <div style={{
                        padding: '12px 16px',
                        background: '#fffbeb',
                        border: '1px solid #fef3c7',
                        borderRadius: 8,
                        marginBottom: 16
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b45309', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                            <AlertTriangle size={16} /> Cảnh báo tồn kho cho các sản phẩm trong lô đã chọn:
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: '#92400e' }}>
                            {warnings.map((w, i) => (
                                <li key={i}><strong>Lô {w.code}</strong> (SKU: {w.sku}): {w.warning}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Payment Breakdown Card */}
                {chosen.length > 0 && (
                    <div style={{
                        padding: '16px 20px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        marginBottom: 16
                    }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, alignItems: 'center' }}>
                            <div>
                                <span style={{ fontSize: 12, color: '#64748b', display: 'block' }}>Tiền hàng ({chosen.length} lô)</span>
                                <strong style={{ fontSize: 16, color: '#1e293b' }}>{formatCurrency(total)}</strong>
                            </div>
                            <div>
                                <span style={{ fontSize: 12, color: '#64748b', display: 'block' }}>Phí dịch vụ WareFlow (5%)</span>
                                <strong style={{ fontSize: 16, color: '#b45309' }}>+ {formatCurrency(fee)}</strong>
                            </div>
                            <div>
                                <span style={{ fontSize: 12, color: '#64748b', display: 'block' }}>Tổng thanh toán</span>
                                <strong style={{ fontSize: 20, color: '#0f766e' }}>{formatCurrency(grandTotal)}</strong>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <small style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 6 }}>
                                    {manager ? 'Thanh toán từ số dư ví kho khi cty duyệt' : 'Trừ trực tiếp từ số dư ví công ty'}
                                </small>
                                <button
                                    className="adm-btn adm-btn-primary"
                                    type="button"
                                    disabled={!chosen.length || selected.length > 100 || batches.loading || !!batches.error || reservations.loading || reservations.refreshing || !!reservations.error}
                                    onClick={() => submit()}
                                    style={{ padding: '8px 18px', fontSize: 14 }}
                                >
                                    {manager ? 'Gửi yêu cầu nhập hàng' : 'Thanh toán và nhập kho ngay'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {error && <div className="wf-notice" role="alert">{error}</div>}
            </fieldset>
            </Modal>}

            {/* Orders Table */}
            <div className="wf-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#1e293b' }}>Lịch sử và tiến độ yêu cầu nhập kho</h3>
                </div>
                <div className="workspace-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Lô hàng</th>
                                <th>Thanh toán từ</th>
                                <th style={{ textAlign: 'right' }}>Tiền hàng</th>
                                <th style={{ textAlign: 'right' }}>Phí sàn (5%)</th>
                                <th style={{ textAlign: 'center' }}>Trạng thái</th>
                                <th style={{ textAlign: 'center' }}>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.error ? (
                                <tr><td colSpan={6} role="alert">
                                    <p>Không tải được lịch sử nhập kho. {orders.error}</p>
                                    <button type="button" className="adm-btn" onClick={orders.reload}>Thử lại</button>
                                </td></tr>
                            ) : orders.loading ? (
                                <tr><td colSpan={6} role="status">Đang tải lịch sử nhập kho…</td></tr>
                            ) : !orders.data?.length ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px 0', color: '#64748b' }}>
                                        Chưa có yêu cầu nhập kho nào.
                                    </td>
                                </tr>
                            ) : (
                                orders.data.map(o => {
                                    const st = statuses[o.status] || { label: o.status, tone: 'info' as const };
                                    const orderFee = Math.round(Number(o.total || 0) * 5) / 100;
                                    return (
                                        <tr key={o.id}>
                                            <td style={{ fontWeight: 600 }}>{o.batches.map(b => b.code).join(', ')}</td>
                                            <td>
                                                <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: o.warehousePayment ? '#f3edfc' : '#eff6ff', color: o.warehousePayment ? '#7955c1' : '#2563eb', fontWeight: 600 }}>
                                                    {o.warehousePayment ? 'Ví kho' : 'Ví công ty'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(o.total)}</td>
                                            <td style={{ textAlign: 'right', color: '#b45309' }}>{formatCurrency(orderFee)}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <Badge label={st.label} tone={st.tone} />
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                                    {!manager && ['PENDING', 'PROCESSING'].includes(o.status) && (
                                                        <button
                                                            className="adm-btn adm-btn-primary"
                                                            style={{ padding: '4px 10px', fontSize: 12 }}
                                                            disabled={busy}
                                                            onClick={() => { setError(''); setDecision({ order: o, action: 'approve' }); }}
                                                        >
                                                            {o.warehousePayment && o.status === 'PENDING'
                                                                ? 'Duyệt & thanh toán'
                                                                : 'Thử lại quyết toán'}
                                                        </button>
                                                    )}
                                                    {o.status === 'PENDING' && (
                                                        <button
                                                            className="adm-btn"
                                                            style={{ padding: '4px 10px', fontSize: 12, color: '#ef4444' }}
                                                            disabled={busy}
                                                            onClick={() => { setError(''); setDecision({ order: o, action: 'cancel' }); }}
                                                        >
                                                            {manager ? 'Hủy' : 'Từ chối'}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {decision && <Modal title={decision.action === 'approve' ? 'Xác nhận thanh toán' : 'Xác nhận hủy yêu cầu'}
                onClose={() => { if (!busy) setDecision(null); }}>
                <div className="wf-operation-stack">
                    <p>{decision.order.batches.map(batch => batch.code).join(', ')}</p>
                    {decision.action === 'approve' && <p>
                        Trừ {formatCurrency(Number(decision.order.total) + Math.round(Number(decision.order.total) * 5) / 100)}
                        {' '}từ {decision.order.warehousePayment ? 'ví kho' : 'ví công ty'}, đã gồm phí 5%.
                    </p>}
                    {error && <p className="wf-notice" role="alert">{error}</p>}
                    <div className="wf-operation-actions">
                        <button type="button" className="adm-btn" disabled={busy} onClick={() => setDecision(null)}>Quay lại</button>
                        <button type="button" className="adm-btn adm-btn-primary" disabled={busy}
                            onClick={() => submit('/' + decision.order.id + '/' + decision.action)}>
                            {busy ? 'Đang xử lý…' : decision.action === 'approve' ? 'Thanh toán' : 'Hủy yêu cầu'}
                        </button>
                    </div>
                </div>
            </Modal>}
        </div>
    );
}
