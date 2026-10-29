import { useMemo, useState } from 'react';
import { Download, MapPin, Search, Truck } from 'lucide-react';
import { Badge, Card, EmptyState, Pagination } from '../../components/admin/AdminUI';
import { shipments } from '../../data/adminData';
import type { ShipmentStatus } from '../../types/admin';
import { formatCompactCurrency, formatDateTime, shipmentStatusMeta } from '../../utils/format';

const PAGE_SIZE = 6;

export default function AdminShipments() {
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | ShipmentStatus>('ALL');
    const [page, setPage] = useState(1);

    const filtered = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        return shipments.filter((shipment) => {
            const matchesQuery =
                !keyword ||
                shipment.trackingCode.toLowerCase().includes(keyword) ||
                shipment.carrier.toLowerCase().includes(keyword) ||
                shipment.customerName.toLowerCase().includes(keyword);
            const matchesStatus = statusFilter === 'ALL' || shipment.status === statusFilter;
            return matchesQuery && matchesStatus;
        });
    }, [query, statusFilter]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, pageCount);
    const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    function updateFilter<T>(setter: (value: T) => void) {
        return (value: T) => {
            setter(value);
            setPage(1);
        };
    }

    const totalCod = shipments.reduce((sum, shipment) => sum + shipment.codAmount, 0);

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
                    const count = shipments.filter((shipment) => shipment.status === status).length;
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
                                <span>{Math.round((count / shipments.length) * 100)}% tổng đơn</span>
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
                                        <tr key={shipment.id}>
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
        </>
    );
}
