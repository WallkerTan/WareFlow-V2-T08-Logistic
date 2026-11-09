import { useMemo, useState } from 'react';
import { Check, Download, Info, MapPin, Search, ShieldAlert, Trash2, Truck } from 'lucide-react';
import { Badge, Card, EmptyState, Modal, Pagination } from '../../components/admin/AdminUI';
import { shipments as seedShipments } from '../../data/adminData';
import type { Shipment, ShipmentStatus } from '../../types/admin';
import { formatCompactCurrency, formatDateTime, shipmentStatusMeta } from '../../utils/format';

const PAGE_SIZE = 6;

export default function AdminShipments() {
    const [rows, setRows] = useState<Shipment[]>(seedShipments);
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | ShipmentStatus>('ALL');
    const [page, setPage] = useState(1);
    const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
    const [editForm, setEditForm] = useState<{
        customerName: string;
        destination: string;
        carrier: string;
        warehouseName: string;
        status: ShipmentStatus;
        codAmount: number;
    }>({
        customerName: '',
        destination: '',
        carrier: '',
        warehouseName: '',
        status: 'CREATED',
        codAmount: 0,
    });
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const openShipmentDetail = (shipment: Shipment) => {
        setSelectedShipment(shipment);
        setEditForm({
            customerName: shipment.customerName,
            destination: shipment.destination,
            carrier: shipment.carrier,
            warehouseName: shipment.warehouseName,
            status: shipment.status,
            codAmount: shipment.codAmount,
        });
        setConfirmDelete(false);
    };

    const handleSaveShipment = () => {
        if (!selectedShipment) return;
        setRows((prev) =>
            prev.map((s) =>
                s.id === selectedShipment.id
                    ? {
                          ...s,
                          ...editForm,
                      }
                    : s
            )
        );
        setSelectedShipment(null);
        showToast(`Đã lưu thay đổi cho vận đơn ${selectedShipment.trackingCode}.`);
    };

    const handleDeleteShipment = () => {
        if (!selectedShipment) return;
        if (selectedShipment.status === 'DELIVERED') {
            alert('Ràng buộc CSDL: Vận đơn đã giao hàng thành công, không thể xóa!');
            return;
        }
        setRows((prev) => prev.filter((s) => s.id !== selectedShipment.id));
        const code = selectedShipment.trackingCode;
        setSelectedShipment(null);
        showToast(`Đã hủy/xóa vận đơn ${code}.`);
    };

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3500);
    };

    const filtered = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        return rows.filter((shipment) => {
            const matchesQuery =
                !keyword ||
                shipment.trackingCode.toLowerCase().includes(keyword) ||
                shipment.carrier.toLowerCase().includes(keyword) ||
                shipment.customerName.toLowerCase().includes(keyword);
            const matchesStatus = statusFilter === 'ALL' || shipment.status === statusFilter;
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

    const totalCod = rows.reduce((sum, shipment) => sum + shipment.codAmount, 0);

    return (
        <>
            <div className="admin-page-head">
                <div>
                    <h2>Vận chuyển</h2>
                    <p>Theo dõi trạng thái giao hàng, mã vận đơn và giá trị thu hộ trên toàn hệ thống.</p>
                </div>
                <div className="admin-page-actions">
                    <button className="adm-btn">
                        <Download size={15} /> Xuất CSV
                    </button>
                </div>
            </div>

            <div className="adm-stats">
                {(['CREATED', 'IN_TRANSIT', 'DELIVERED', 'FAILED'] as ShipmentStatus[]).map((status) => {
                    const meta = shipmentStatusMeta[status];
                    const count = rows.filter((shipment) => shipment.status === status).length;
                    return (
                        <article className="adm-stat" key={status}>
                            <div className="adm-stat-top">
                                <span className="adm-stat-label">{meta.label}</span>
                                <span className={`adm-stat-icon ${status === 'DELIVERED' ? 'is-success' : status === 'FAILED' ? '' : status === 'IN_TRANSIT' ? 'is-purple' : 'is-warning'}`}>
                                    <Truck size={17} />
                                </span>
                            </div>
                            <div className="adm-stat-value">{count}</div>
                            <div className="adm-stat-foot">
                                <span>{rows.length > 0 ? Math.round((count / rows.length) * 100) : 0}% tổng đơn</span>
                            </div>
                        </article>
                    );
                })}
                <article className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">Tổng COD</span>
                        <span className="adm-stat-icon is-success">
                            <Truck size={17} />
                        </span>
                    </div>
                    <div className="adm-stat-value">{formatCompactCurrency(totalCod)}</div>
                    <div className="adm-stat-foot">
                        <span>Giá trị thu hộ</span>
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
                            placeholder="Tìm theo mã vận đơn, đơn vị, khách hàng…"
                            value={query}
                            onChange={(event) => updateFilter(setQuery)(event.target.value)}
                            aria-label="Tìm kiếm vận đơn"
                        />
                    </label>
                    <select
                        className="adm-select"
                        value={statusFilter}
                        onChange={(event) => updateFilter(setStatusFilter)(event.target.value as 'ALL' | ShipmentStatus)}
                        aria-label="Lọc theo trạng thái vận đơn"
                    >
                        <option value="ALL">Tất cả trạng thái</option>
                        {Object.entries(shipmentStatusMeta).map(([value, meta]) => (
                            <option key={value} value={value}>
                                {meta.label}
                            </option>
                        ))}
                    </select>
                    <div className="adm-toolbar-right">
                        <span className="adm-count">{filtered.length} vận đơn</span>
                    </div>
                </div>

                {visible.length === 0 ? (
                    <EmptyState
                        icon={<Truck size={22} />}
                        title="Không tìm thấy vận đơn"
                        description="Không có đơn vận chuyển nào khớp với điều kiện đang lọc."
                    />
                ) : (
                    <div className="adm-table-wrap">
                        <table className="adm-table">
                            <thead>
                                <tr>
                                    <th>Mã vận đơn</th>
                                    <th>Khách hàng</th>
                                    <th>Đơn vị vận chuyển</th>
                                    <th>Kho xuất</th>
                                    <th>Trạng thái</th>
                                    <th className="adm-text-right">COD</th>
                                    <th>Thời gian</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((shipment) => {
                                    const status = shipmentStatusMeta[shipment.status];
                                    return (
                                        <tr
                                            key={shipment.id}
                                            onClick={() => openShipmentDetail(shipment)}
                                            title="Nhấp để xem chi tiết & cập nhật vận đơn"
                                        >
                                            <td className="adm-mono adm-cell-main">{shipment.trackingCode}</td>
                                            <td>
                                                <span className="adm-cell-main">{shipment.customerName}</span>
                                                <span className="adm-cell-sub">
                                                    <MapPin size={11} style={{ verticalAlign: -1 }} /> {shipment.destination}
                                                </span>
                                            </td>
                                            <td>{shipment.carrier}</td>
                                            <td>{shipment.warehouseName}</td>
                                            <td>
                                                <Badge label={status.label} tone={status.tone} />
                                            </td>
                                            <td className="adm-text-right adm-cell-main">{formatCompactCurrency(shipment.codAmount)}</td>
                                            <td className="adm-muted">{formatDateTime(shipment.createdAt)}</td>
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

            {selectedShipment && (
                <Modal
                    title={`Vận đơn: ${selectedShipment.trackingCode}`}
                    description={`ID: ${selectedShipment.id} · delivery-service: shipments`}
                    onClose={() => setSelectedShipment(null)}
                    footer={
                        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                {selectedShipment.status === 'DELIVERED' ? (
                                    <span style={{ fontSize: 11, color: '#6b7280', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <ShieldAlert size={14} color="#10b981" /> Đã giao thành công (Chốt hồ sơ COD)
                                    </span>
                                ) : confirmDelete ? (
                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                        <span style={{ fontSize: 12, color: '#ef4444' }}>Hủy vận đơn này?</span>
                                        <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={handleDeleteShipment}>
                                            Hủy / Xóa
                                        </button>
                                        <button className="adm-btn adm-btn-sm" onClick={() => setConfirmDelete(false)}>
                                            Không
                                        </button>
                                    </div>
                                ) : (
                                    <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => setConfirmDelete(true)}>
                                        <Trash2 size={14} /> Hủy vận đơn
                                    </button>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="adm-btn" onClick={() => setSelectedShipment(null)}>
                                    Hủy
                                </button>
                                {selectedShipment.status !== 'DELIVERED' && (
                                    <button className="adm-btn adm-btn-primary" onClick={handleSaveShipment}>
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
                                <strong>Ràng buộc giao vận (delivery-service: shipments):</strong>
                                <p style={{ margin: '4px 0 0' }}>
                                    Vận đơn xuất từ kho <b>{selectedShipment.warehouseName}</b> theo phiếu xuất kho tương ứng (<code>document_id</code>). Khi đơn đã giao thành công và thu COD, trạng thái sẽ khóa để tránh gian lận đối soát tiền hàng.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="adm-form">
                        <div className="adm-field-grid">
                            <div className="adm-field">
                                <label>Mã vận đơn (Tracking Code)</label>
                                <input
                                    className="adm-input"
                                    value={selectedShipment.trackingCode}
                                    disabled
                                    style={{ background: '#f8fafc', cursor: 'not-allowed', fontFamily: 'monospace' }}
                                />
                            </div>
                            <div className="adm-field">
                                <label>Kho xuất hàng</label>
                                <input
                                    className="adm-input"
                                    value={selectedShipment.warehouseName}
                                    disabled
                                    style={{ background: '#f8fafc', cursor: 'not-allowed' }}
                                />
                            </div>
                        </div>
                        <div className="adm-field-grid">
                            <div className="adm-field">
                                <label>Khách hàng người nhận</label>
                                <input
                                    className="adm-input"
                                    value={editForm.customerName}
                                    disabled={selectedShipment.status === 'DELIVERED'}
                                    onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                                />
                            </div>
                            <div className="adm-field">
                                <label>Đơn vị vận chuyển</label>
                                <input
                                    className="adm-input"
                                    value={editForm.carrier}
                                    disabled={selectedShipment.status === 'DELIVERED'}
                                    onChange={(e) => setEditForm({ ...editForm, carrier: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="adm-field">
                            <label>Địa chỉ nhận hàng</label>
                            <input
                                className="adm-input"
                                value={editForm.destination}
                                disabled={selectedShipment.status === 'DELIVERED'}
                                onChange={(e) => setEditForm({ ...editForm, destination: e.target.value })}
                            />
                        </div>
                        <div className="adm-field-grid">
                            <div className="adm-field">
                                <label>Tiền thu hộ COD (VNĐ)</label>
                                <input
                                    className="adm-input"
                                    type="number"
                                    value={editForm.codAmount}
                                    disabled={selectedShipment.status === 'DELIVERED'}
                                    onChange={(e) => setEditForm({ ...editForm, codAmount: Number(e.target.value) })}
                                />
                            </div>
                            <div className="adm-field">
                                <label>Trạng thái giao vận</label>
                                <select
                                    className="adm-select"
                                    value={editForm.status}
                                    disabled={selectedShipment.status === 'DELIVERED'}
                                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as ShipmentStatus })}
                                >
                                    <option value="CREATED">Mới tạo (CREATED)</option>
                                    <option value="IN_TRANSIT">Đang giao hàng (IN_TRANSIT)</option>
                                    <option value="DELIVERED">Đã giao thành công (DELIVERED)</option>
                                    <option value="FAILED">Giao thất bại (FAILED)</option>
                                    <option value="RETURNED">Chuyển hoàn (RETURNED)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
}
