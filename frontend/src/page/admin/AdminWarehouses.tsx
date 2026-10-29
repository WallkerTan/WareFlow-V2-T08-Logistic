import { useMemo, useState } from 'react';
import { Download, MapPin, Pencil, Plus, Search, Warehouse } from 'lucide-react';
import { Badge, Card, EmptyState, Pagination, Progress } from '../../components/admin/AdminUI';
import { warehouses as seedWarehouses } from '../../data/adminData';
import type { Warehouse as WarehouseType, WarehouseStatus, WarehouseType as WarehouseKind } from '../../types/admin';
import { formatArea, formatCompactCurrency, warehouseStatusMeta, warehouseTypeMeta } from '../../utils/format';

const PAGE_SIZE = 6;

export default function AdminWarehouses() {
    const [rows] = useState<WarehouseType[]>(seedWarehouses);
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | WarehouseStatus>('ALL');
    const [typeFilter, setTypeFilter] = useState<'ALL' | WarehouseKind>('ALL');
    const [page, setPage] = useState(1);

    const filtered = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        return rows.filter((warehouse) => {
            const matchesQuery =
                !keyword ||
                warehouse.name.toLowerCase().includes(keyword) ||
                warehouse.ownerCompanyName.toLowerCase().includes(keyword) ||
                warehouse.region.toLowerCase().includes(keyword);
            const matchesStatus = statusFilter === 'ALL' || warehouse.status === statusFilter;
            const matchesType = typeFilter === 'ALL' || warehouse.warehouseType === typeFilter;
            return matchesQuery && matchesStatus && matchesType;
        });
    }, [rows, query, statusFilter, typeFilter]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, pageCount);
    const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    function updateFilter<T>(setter: (value: T) => void) {
        return (value: T) => {
            setter(value);
            setPage(1);
        };
    }

    const totalArea = rows.reduce((sum, warehouse) => sum + warehouse.area, 0);
    const totalValue = rows.reduce((sum, warehouse) => sum + warehouse.price, 0);
    const averageUtilization = Math.round(rows.reduce((sum, warehouse) => sum + warehouse.utilization, 0) / rows.length);

    return (
        <>
            <div className="admin-page-head">
                <div>
                    <h2>Quản lý kho hàng</h2>
                    <p>Theo dõi sức chứa, tình trạng vận hành và giá trị tài sản kho của toàn hệ thống.</p>
                </div>
                <div className="admin-page-actions">
                    <button className="adm-btn">
                        <Download size={15} /> Xuất báo cáo
                    </button>
                    <button className="adm-btn adm-btn-primary">
                        <Plus size={16} /> Thêm kho
                    </button>
                </div>
            </div>

            <div className="adm-stats">
                <article className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">Tổng số kho</span>
                        <span className="adm-stat-icon">
                            <Warehouse size={17} />
                        </span>
                    </div>
                    <div className="adm-stat-value">{rows.length}</div>
                    <div className="adm-stat-foot">
                        <span>{rows.filter((warehouse) => warehouse.status === 'ACTIVE').length} đang vận hành</span>
                    </div>
                </article>
                <article className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">Tổng diện tích</span>
                        <span className="adm-stat-icon is-success">
                            <MapPin size={17} />
                        </span>
                    </div>
                    <div className="adm-stat-value">{formatArea(totalArea).replace(' m²', '')}</div>
                    <div className="adm-stat-foot">
                        <span>Trên toàn hệ thống</span>
                    </div>
                </article>
                <article className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">Giá trị tài sản</span>
                        <span className="adm-stat-icon is-purple">
                            <Download size={17} />
                        </span>
                    </div>
                    <div className="adm-stat-value">{formatCompactCurrency(totalValue)}</div>
                    <div className="adm-stat-foot">
                        <span>Ước tính theo hợp đồng</span>
                    </div>
                </article>
                <article className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">Sức chứa trung bình</span>
                        <span className="adm-stat-icon is-warning">
                            <Warehouse size={17} />
                        </span>
                    </div>
                    <div className="adm-stat-value">{averageUtilization}%</div>
                    <div className="adm-stat-foot">
                        <span>Mức sử dụng bình quân</span>
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
                            placeholder="Tìm theo tên kho, chủ sở hữu, khu vực…"
                            value={query}
                            onChange={(event) => updateFilter(setQuery)(event.target.value)}
                            aria-label="Tìm kiếm kho hàng"
                        />
                    </label>
                    <select
                        className="adm-select"
                        value={statusFilter}
                        onChange={(event) => updateFilter(setStatusFilter)(event.target.value as 'ALL' | WarehouseStatus)}
                        aria-label="Lọc theo trạng thái kho"
                    >
                        <option value="ALL">Tất cả trạng thái</option>
                        {Object.entries(warehouseStatusMeta).map(([value, meta]) => (
                            <option key={value} value={value}>
                                {meta.label}
                            </option>
                        ))}
                    </select>
                    <select
                        className="adm-select"
                        value={typeFilter}
                        onChange={(event) => updateFilter(setTypeFilter)(event.target.value as 'ALL' | WarehouseKind)}
                        aria-label="Lọc theo hình thức sở hữu"
                    >
                        <option value="ALL">Tất cả hình thức</option>
                        <option value="BUY">Mua sở hữu</option>
                        <option value="RENT">Thuê</option>
                    </select>
                    <div className="adm-toolbar-right">
                        <span className="adm-count">{filtered.length} kho</span>
                    </div>
                </div>

                {visible.length === 0 ? (
                    <EmptyState
                        icon={<Warehouse size={22} />}
                        title="Không tìm thấy kho hàng"
                        description="Không có kho nào khớp với bộ lọc hiện tại. Hãy thử mở rộng điều kiện tìm kiếm."
                    />
                ) : (
                    <div className="adm-table-wrap">
                        <table className="adm-table">
                            <thead>
                                <tr>
                                    <th>Kho hàng</th>
                                    <th>Chủ sở hữu</th>
                                    <th>Hình thức</th>
                                    <th>Diện tích</th>
                                    <th>Sức chứa</th>
                                    <th>Trạng thái</th>
                                    <th className="adm-col-actions">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((warehouse) => {
                                    const status = warehouseStatusMeta[warehouse.status];
                                    const kind = warehouseTypeMeta[warehouse.warehouseType];
                                    return (
                                        <tr key={warehouse.id}>
                                            <td>
                                                <span className="adm-cell-main">{warehouse.name}</span>
                                                <span className="adm-cell-sub">
                                                    <MapPin size={11} style={{ verticalAlign: -1 }} /> {warehouse.region}
                                                </span>
                                            </td>
                                            <td>{warehouse.ownerCompanyName}</td>
                                            <td>
                                                <Badge label={kind.label} tone={kind.tone} />
                                            </td>
                                            <td>{formatArea(warehouse.area)}</td>
                                            <td>
                                                <div className="adm-progress-row">
                                                    <Progress
                                                        value={warehouse.utilization}
                                                        tone={warehouse.utilization >= 85 ? 'danger' : warehouse.utilization >= 60 ? 'warning' : 'success'}
                                                    />
                                                    <span>{warehouse.utilization}%</span>
                                                </div>
                                            </td>
                                            <td>
                                                <Badge label={status.label} tone={status.tone} />
                                            </td>
                                            <td className="adm-col-actions">
                                                <button className="adm-btn adm-btn-sm adm-btn-icon" aria-label={`Sửa ${warehouse.name}`}>
                                                    <Pencil size={14} />
                                                </button>
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
