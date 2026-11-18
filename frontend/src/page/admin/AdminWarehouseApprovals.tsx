import { useMemo, useState } from 'react';
import { Check, X, Warehouse } from 'lucide-react';
import { Badge, Card, EmptyState, Modal } from '../../components/admin/AdminUI';
import { useAdminData, saveResource, attempt } from '../../services/data';
import type { Row } from '../../services/api';
import { formatRelativeTime } from '../../utils/format';

function txTypeBadge(type: string) {
    if (type === 'BUY') return <Badge label="Mua" tone="info" />;
    if (type === 'RENT') return <Badge label="Thuê" tone="purple" />;
    return <Badge label={type} tone="neutral" />;
}

function txStatusBadge(status: string) {
    if (status === 'PENDING') return <Badge label="Chờ duyệt" tone="warning" />;
    if (status === 'NEGOTIATING') return <Badge label="Đàm phán" tone="info" />;
    return <Badge label={status} tone="neutral" />;
}

export default function AdminWarehouseApprovals() {
    const { raw } = useAdminData('warehouseTransactions');
    const pending = useMemo(
        () =>
            (raw.warehouseTransactions as Row[]).filter(
                (tx) => tx.status === 'PENDING' || tx.status === 'NEGOTIATING',
            ),
        [raw.warehouseTransactions],
    );
    const [confirmTx, setConfirmTx] = useState<{ tx: Row; action: 'approve' | 'reject' } | null>(null);
    const [busy, setBusy] = useState(false);

    async function handleAction(tx: Row, action: 'approve' | 'reject') {
        setBusy(true);
        await attempt(() =>
            saveResource(
                'core',
                `/warehouse-transactions/${tx.id}/${action === 'approve' ? 'approve' : 'reject'}`,
                'POST',
                action === 'reject' ? { reason: 'Không phù hợp' } : {},
            ),
        );
        setBusy(false);
        setConfirmTx(null);
    }

    return (
        <>
            <div className="admin-page-head">
                <div>
                    <h2>Duyệt kho hàng</h2>
                    <p>Các yêu cầu mua hoặc thuê kho từ công ty đang chờ phê duyệt.</p>
                </div>
            </div>

            <Card title="Danh sách yêu cầu" subtitle={`${pending.length} yêu cầu`}>
                {pending.length === 0 ? (
                    <EmptyState
                        icon={<Warehouse size={32} />}
                        title="Không có yêu cầu nào chờ duyệt"
                        description="Khi công ty gửi yêu cầu mua hoặc thuê kho, chúng sẽ xuất hiện ở đây."
                    />
                ) : (
                    <div className="adm-table-wrap">
                        <table className="adm-table">
                            <thead>
                                <tr>
                                    <th>Kho hàng</th>
                                    <th>Công ty</th>
                                    <th>Loại</th>
                                    <th>Giá đề xuất</th>
                                    <th>Thời gian</th>
                                    <th>Trạng thái</th>
                                    <th>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pending.map((tx) => (
                                    <tr key={String(tx.id)}>
                                        <td><strong>{String(tx.warehouseName || tx.warehouseId || '—')}</strong></td>
                                        <td>{String(tx.companyName || tx.companyId || '—')}</td>
                                        <td>{txTypeBadge(String(tx.type))}</td>
                                        <td>
                                            {tx.offeredPrice
                                                ? Number(tx.offeredPrice).toLocaleString('vi-VN') + ' ₫'
                                                : '—'}
                                        </td>
                                        <td>{formatRelativeTime(String(tx.createdAt || ''))}</td>
                                        <td>{txStatusBadge(String(tx.status))}</td>
                                        <td>
                                            <div className="adm-actions">
                                                <button
                                                    className="adm-btn adm-btn-primary"
                                                    onClick={() => setConfirmTx({ tx, action: 'approve' })}
                                                >
                                                    <Check size={14} /> Duyệt
                                                </button>
                                                <button
                                                    className="adm-btn adm-btn-danger"
                                                    onClick={() => setConfirmTx({ tx, action: 'reject' })}
                                                >
                                                    <X size={14} /> Từ chối
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {confirmTx && (
                <Modal
                    title={confirmTx.action === 'approve' ? 'Xác nhận duyệt kho' : 'Từ chối yêu cầu'}
                    description={
                        confirmTx.action === 'approve'
                            ? `Duyệt yêu cầu ${String(confirmTx.tx.type)} kho "${String(confirmTx.tx.warehouseName || confirmTx.tx.warehouseId)}"?`
                            : `Từ chối yêu cầu ${String(confirmTx.tx.type)} kho "${String(confirmTx.tx.warehouseName || confirmTx.tx.warehouseId)}"?`
                    }
                    onClose={() => setConfirmTx(null)}
                    footer={
                        <>
                            <button className="adm-btn" onClick={() => setConfirmTx(null)}>
                                Hủy
                            </button>
                            <button
                                className={`adm-btn ${confirmTx.action === 'approve' ? 'adm-btn-primary' : 'adm-btn-danger'}`}
                                disabled={busy}
                                onClick={() => handleAction(confirmTx.tx, confirmTx.action)}
                            >
                                {busy
                                    ? 'Đang xử lý…'
                                    : confirmTx.action === 'approve'
                                    ? 'Xác nhận duyệt'
                                    : 'Xác nhận từ chối'}
                            </button>
                        </>
                    }
                >
                    <div className={`adm-inline-note ${confirmTx.action === 'reject' ? 'is-danger' : 'is-success'}`}>
                        {confirmTx.action === 'approve' ? <Check size={15} /> : <X size={15} />}
                        <span>
                            {confirmTx.action === 'approve'
                                ? 'Yêu cầu sẽ được phê duyệt và công ty có thể tiến hành giao dịch.'
                                : 'Yêu cầu sẽ bị từ chối. Công ty sẽ được thông báo.'}
                        </span>
                    </div>
                </Modal>
            )}
        </>
    );
}
