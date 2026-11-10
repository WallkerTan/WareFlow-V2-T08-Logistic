import { useMemo, useState } from 'react';
import { Check, Download, Info, MapPin, Pencil, Plus, Search, ShieldAlert, Trash2, Warehouse } from 'lucide-react';
import { Badge, Card, EmptyState, Modal, Pagination, Progress } from '../../components/admin/AdminUI';
import { warehouses as seedWarehouses } from '../../data/adminData';
import type { Warehouse as WarehouseType, WarehouseStatus, WarehouseType as WarehouseKind } from '../../types/admin';
import { formatArea, formatCompactCurrency, warehouseStatusMeta, warehouseTypeMeta } from '../../utils/format';

const PAGE_SIZE = 6;

export default function AdminWarehouses() {
    const [rows, setRows] = useState<WarehouseType[]>(seedWarehouses);
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | WarehouseStatus>('ALL');
    const [typeFilter, setTypeFilter] = useState<'ALL' | WarehouseKind>('ALL');
    const [page, setPage] = useState(1);
    const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseType | null>(null);
    const [editForm, setEditForm] = useState<{
        name: string;
        ownerCompanyName: string;
        warehouseType: WarehouseKind;
        area: number;
        utilization: number;
        price: number;
        region: string;
        status: WarehouseStatus;
    }>({
        name: '',
        ownerCompanyName: '',
        warehouseType: 'RENT',
        area: 0,
        utilization: 0,
        price: 0,
        region: '',
        status: 'ACTIVE',
    });
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const openWarehouseDetail = (warehouse: WarehouseType) => {
        setSelectedWarehouse(warehouse);
        setEditForm({
            name: warehouse.name,
            ownerCompanyName: warehouse.ownerCompanyName,
            warehouseType: warehouse.warehouseType,
            area: warehouse.area,
            utilization: warehouse.utilization,
            price: warehouse.price,
            region: warehouse.region,
            status: warehouse.status,
        });
        setConfirmDelete(false);
    };

    const handleSaveWarehouse = () => {
        if (!selectedWarehouse) return;
        setRows((prev) =>
            prev.map((w) =>
                w.id === selectedWarehouse.id
                    ? {
                          ...w,
                          ...editForm,
                      }
                    : w
            )
        );
        setSelectedWarehouse(null);
        showToast(`Đã lưu thay đổi thông tin kho "${editForm.name}".`);
    };

    const handleDeleteWarehouse = () => {
        if (!selectedWarehouse) return;
        if (selectedWarehouse.status === 'ACTIVE' && selectedWarehouse.utilization > 0) {
            alert('Ràng buộc CSDL: Kho đang hoạt động và có tồn kho lưu trữ, không thể xóa trực tiếp!');
            return;
        }
        setRows((prev) => prev.filter((w) => w.id !== selectedWarehouse.id));
        const name = selectedWarehouse.name;
        setSelectedWarehouse(null);
        showToast(`Đã xóa kho "${name}" khỏi hệ thống.`);
    };

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3500);
    };

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
                                        <tr
                                            key={warehouse.id}
                                            onClick={() => openWarehouseDetail(warehouse)}
                                            title="Nhấp để xem chi tiết & chỉnh sửa"
                                        >
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
                                                <button
                                                    className="adm-btn adm-btn-sm adm-btn-icon"
                                                    aria-label={`Sửa ${warehouse.name}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openWarehouseDetail(warehouse);
                                                    }}
                                                >
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

            {selectedWarehouse && (
                <Modal
                    title={`Chi tiết kho: ${selectedWarehouse.name}`}
                    description={`ID: ${selectedWarehouse.id} · core-service: warehouses`}
                    onClose={() => setSelectedWarehouse(null)}
                    footer={
                        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                {selectedWarehouse.status === 'ACTIVE' && selectedWarehouse.utilization > 0 ? (
                                    <span style={{ fontSize: 11, color: '#6b7280', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <ShieldAlert size={14} color="#f59e0b" /> Không thể xóa (Kho đang hoạt động chứa hàng)
                                    </span>
                                ) : confirmDelete ? (
                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                        <span style={{ fontSize: 12, color: '#ef4444' }}>Xác nhận xóa kho?</span>
                                        <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={handleDeleteWarehouse}>
                                            Xóa vĩnh viễn
                                        </button>
                                        <button className="adm-btn adm-btn-sm" onClick={() => setConfirmDelete(false)}>
                                            Hủy
                                        </button>
                                    </div>
                                ) : (
                                    <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => setConfirmDelete(true)}>
                                        <Trash2 size={14} /> Xóa kho
                                    </button>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="adm-btn" onClick={() => setSelectedWarehouse(null)}>
                                    Hủy
                                </button>
                                <button className="adm-btn adm-btn-primary" onClick={handleSaveWarehouse}>
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
                                <strong>Ràng buộc quan hệ CSDL (core-service: warehouses):</strong>
                                <p style={{ margin: '4px 0 0' }}>
                                    Kho hàng liên kết với <code>owner_company_id</code> ({selectedWarehouse.ownerCompanyName}) và lưu trữ hàng hóa qua <code>inventory-service: stock_lots</code>. Kho đang có công suất {selectedWarehouse.utilization}% không thể xóa trực tiếp để tránh mất dữ liệu hàng hóa & vị trí lưu kho.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="adm-form">
                        <div className="adm-field">
                            <label>Tên kho hàng</label>
                            <input
                                className="adm-input"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            />
                        </div>
                        <div className="adm-field-grid">
                            <div className="adm-field">
                                <label>Chủ sở hữu (Công ty)</label>
                                <input
                                    className="adm-input"
                                    value={editForm.ownerCompanyName}
                                    onChange={(e) => setEditForm({ ...editForm, ownerCompanyName: e.target.value })}
                                />
                            </div>
                            <div className="adm-field">
                                <label>Hình thức kho</label>
                                <select
                                    className="adm-select"
                                    value={editForm.warehouseType}
                                    onChange={(e) => setEditForm({ ...editForm, warehouseType: e.target.value as WarehouseKind })}
                                >
                                    <option value="BUY">Mua sở hữu (BUY)</option>
                                    <option value="RENT">Thuê kho (RENT)</option>
                                </select>
                            </div>
                        </div>
                        <div className="adm-field-grid">
                            <div className="adm-field">
                                <label>Diện tích (m²)</label>
                                <input
                                    className="adm-input"
                                    type="number"
                                    value={editForm.area}
                                    onChange={(e) => setEditForm({ ...editForm, area: Number(e.target.value) })}
                                />
                            </div>
                            <div className="adm-field">
                                <label>Sức chứa đã dùng (%)</label>
                                <input
                                    className="adm-input"
                                    type="number"
                                    value={editForm.utilization}
                                    onChange={(e) => setEditForm({ ...editForm, utilization: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                        <div className="adm-field-grid">
                            <div className="adm-field">
                                <label>Giá trị / Giá thuê (VNĐ)</label>
                                <input
                                    className="adm-input"
                                    type="number"
                                    value={editForm.price}
                                    onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                                />
                            </div>
                            <div className="adm-field">
                                <label>Khu vực</label>
                                <input
                                    className="adm-input"
                                    value={editForm.region}
                                    onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="adm-field">
                            <label>Trạng thái kho</label>
                            <select
                                className="adm-select"
                                value={editForm.status}
                                onChange={(e) => setEditForm({ ...editForm, status: e.target.value as WarehouseStatus })}
                            >
                                <option value="ACTIVE">Đang hoạt động (ACTIVE)</option>
                                <option value="PENDING">Chờ bàn giao (PENDING)</option>
                                <option value="AVAILABLE">Sẵn sàng bán/thuê (AVAILABLE)</option>
                                <option value="RETURNED">Đã thu hồi (RETURNED)</option>
                            </select>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
}
