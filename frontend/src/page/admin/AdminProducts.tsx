import { useMemo, useState } from 'react';
import { AlertTriangle, Boxes, Check, Download, Info, Package, Plus, Search, ShieldAlert, Trash2 } from 'lucide-react';
import { Card, EmptyState, Modal, Pagination } from '../../components/admin/AdminUI';
import { products as seedProducts } from '../../data/adminData';
import type { Product } from '../../types/admin';
import { formatCurrency, formatNumber, formatRelativeTime } from '../../utils/format';

const PAGE_SIZE = 6;

export default function AdminProducts() {
    const [rows, setRows] = useState<Product[]>(seedProducts);
    const [query, setQuery] = useState('');
    const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW' | 'OK'>('ALL');
    const [page, setPage] = useState(1);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [editForm, setEditForm] = useState<{
        name: string;
        unit: string;
        minStock: number;
        price: number;
        barcode: string;
        warehouseName: string;
    }>({
        name: '',
        unit: '',
        minStock: 0,
        price: 0,
        barcode: '',
        warehouseName: '',
    });
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const openProductDetail = (product: Product) => {
        setSelectedProduct(product);
        setEditForm({
            name: product.name,
            unit: product.unit,
            minStock: product.minStock,
            price: product.price,
            barcode: product.barcode,
            warehouseName: product.warehouseName,
        });
        setConfirmDelete(false);
    };

    const handleSaveProduct = () => {
        if (!selectedProduct) return;
        setRows((prev) =>
            prev.map((p) =>
                p.id === selectedProduct.id
                    ? {
                          ...p,
                          ...editForm,
                          updatedAt: new Date().toISOString(),
                      }
                    : p
            )
        );
        setSelectedProduct(null);
        showToast(`Đã lưu thay đổi cho sản phẩm "${editForm.name}".`);
    };

    const handleDeleteProduct = () => {
        if (!selectedProduct) return;
        if (selectedProduct.stock > 0) {
            alert('Ràng buộc CSDL: Sản phẩm còn tồn kho thực tế, không thể xóa trực tiếp!');
            return;
        }
        setRows((prev) => prev.filter((p) => p.id !== selectedProduct.id));
        const name = selectedProduct.name;
        setSelectedProduct(null);
        showToast(`Đã xóa sản phẩm "${name}" khỏi hệ thống.`);
    };

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3500);
    };

    const filtered = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        return rows.filter((product) => {
            const matchesQuery =
                !keyword ||
                product.name.toLowerCase().includes(keyword) ||
                product.sku.toLowerCase().includes(keyword) ||
                product.barcode.includes(keyword);
            const isLow = product.stock < product.minStock;
            const matchesStock = stockFilter === 'ALL' || (stockFilter === 'LOW' ? isLow : !isLow);
            return matchesQuery && matchesStock;
        });
    }, [rows, query, stockFilter]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, pageCount);
    const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    function updateFilter<T>(setter: (value: T) => void) {
        return (value: T) => {
            setter(value);
            setPage(1);
        };
    }

    const lowStockCount = rows.filter((product) => product.stock < product.minStock).length;
    const totalValue = rows.reduce((sum, product) => sum + product.stock * product.price, 0);

    return (
        <>
            <div className="admin-page-head">
                <div>
                    <h2>Danh mục sản phẩm</h2>
                    <p>Quản lý SKU, mức tồn kho tối thiểu và giá trị hàng tồn trên toàn hệ thống.</p>
                </div>
                <div className="admin-page-actions">
                    <button className="adm-btn">
                        <Download size={15} /> Xuất CSV
                    </button>
                    <button className="adm-btn adm-btn-primary">
                        <Plus size={16} /> Thêm sản phẩm
                    </button>
                </div>
            </div>

            <div className="adm-stats">
                <article className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">Tổng SKU</span>
                        <span className="adm-stat-icon">
                            <Boxes size={17} />
                        </span>
                    </div>
                    <div className="adm-stat-value">{formatNumber(rows.length)}</div>
                    <div className="adm-stat-foot">
                        <span>Đang được quản lý tập trung</span>
                    </div>
                </article>
                <article className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">Cảnh báo tồn kho</span>
                        <span className="adm-stat-icon is-warning">
                            <AlertTriangle size={17} />
                        </span>
                    </div>
                    <div className="adm-stat-value">{lowStockCount}</div>
                    <div className="adm-stat-foot">
                        <span>Dưới mức tối thiểu</span>
                    </div>
                </article>
                <article className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">Giá trị tồn kho</span>
                        <span className="adm-stat-icon is-success">
                            <Package size={17} />
                        </span>
                    </div>
                    <div className="adm-stat-value">{formatCurrency(totalValue).replace('₫', '').trim()}</div>
                    <div className="adm-stat-foot">
                        <span>Tính theo giá bán hiện tại</span>
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
                            placeholder="Tìm theo tên, SKU, mã vạch…"
                            value={query}
                            onChange={(event) => updateFilter(setQuery)(event.target.value)}
                            aria-label="Tìm kiếm sản phẩm"
                        />
                    </label>
                    <select
                        className="adm-select"
                        value={stockFilter}
                        onChange={(event) => updateFilter(setStockFilter)(event.target.value as 'ALL' | 'LOW' | 'OK')}
                        aria-label="Lọc theo tình trạng tồn kho"
                    >
                        <option value="ALL">Tất cả tình trạng</option>
                        <option value="LOW">Tồn kho thấp</option>
                        <option value="OK">Tồn kho bình thường</option>
                    </select>
                    <div className="adm-toolbar-right">
                        <span className="adm-count">{filtered.length} sản phẩm</span>
                    </div>
                </div>

                {visible.length === 0 ? (
                    <EmptyState
                        icon={<Boxes size={22} />}
                        title="Không tìm thấy sản phẩm"
                        description="Không có SKU nào khớp với điều kiện tìm kiếm hiện tại."
                    />
                ) : (
                    <div className="adm-table-wrap">
                        <table className="adm-table">
                            <thead>
                                <tr>
                                    <th>Sản phẩm</th>
                                    <th>SKU / Mã vạch</th>
                                    <th>Kho</th>
                                    <th>Tồn kho</th>
                                    <th className="adm-text-right">Đơn giá</th>
                                    <th>Cập nhật</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((product) => {
                                    const isLow = product.stock < product.minStock;
                                    return (
                                        <tr
                                            key={product.id}
                                            onClick={() => openProductDetail(product)}
                                            title="Nhấp để xem chi tiết & chỉnh sửa"
                                        >
                                            <td>
                                                <span className="adm-cell-main">{product.name}</span>
                                                <span className="adm-cell-sub">Đơn vị: {product.unit}</span>
                                            </td>
                                            <td>
                                                <span className="adm-mono adm-cell-main">{product.sku}</span>
                                                <span className="adm-cell-sub adm-mono">{product.barcode}</span>
                                            </td>
                                            <td>{product.warehouseName}</td>
                                            <td>
                                                <span className={isLow ? 'adm-text-danger adm-cell-main' : 'adm-cell-main'}>
                                                    {formatNumber(product.stock)} {product.unit}
                                                </span>
                                                <span className="adm-cell-sub">
                                                    Tối thiểu {formatNumber(product.minStock)} {product.unit}
                                                </span>
                                            </td>
                                            <td className="adm-text-right adm-cell-main">{formatCurrency(product.price)}</td>
                                            <td className="adm-muted">{formatRelativeTime(product.updatedAt)}</td>
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

            {selectedProduct && (
                <Modal
                    title={`Chi tiết sản phẩm: ${selectedProduct.name}`}
                    description={`SKU: ${selectedProduct.sku} · inventory-service: products`}
                    onClose={() => setSelectedProduct(null)}
                    footer={
                        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                {selectedProduct.stock > 0 ? (
                                    <span style={{ fontSize: 11, color: '#6b7280', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <ShieldAlert size={14} color="#f59e0b" /> Không thể xóa (Còn {selectedProduct.stock} {selectedProduct.unit} tồn kho)
                                    </span>
                                ) : confirmDelete ? (
                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                        <span style={{ fontSize: 12, color: '#ef4444' }}>Xác nhận xóa SKU?</span>
                                        <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={handleDeleteProduct}>
                                            Xóa vĩnh viễn
                                        </button>
                                        <button className="adm-btn adm-btn-sm" onClick={() => setConfirmDelete(false)}>
                                            Hủy
                                        </button>
                                    </div>
                                ) : (
                                    <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => setConfirmDelete(true)}>
                                        <Trash2 size={14} /> Xóa sản phẩm
                                    </button>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="adm-btn" onClick={() => setSelectedProduct(null)}>
                                    Hủy
                                </button>
                                <button className="adm-btn adm-btn-primary" onClick={handleSaveProduct}>
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
                                <strong>Ràng buộc quan hệ CSDL (inventory-service: products):</strong>
                                <p style={{ margin: '4px 0 0' }}>
                                    Sản phẩm được lưu trữ tại kho <b>{selectedProduct.warehouseName}</b> và quản lý theo lô hàng <code>stock_lots</code>. Mã SKU là khóa nghiệp vụ không thể sửa đổi sau khi phát sinh giao dịch kho.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="adm-form">
                        <div className="adm-field">
                            <label>Tên sản phẩm</label>
                            <input
                                className="adm-input"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            />
                        </div>
                        <div className="adm-field-grid">
                            <div className="adm-field">
                                <label>Mã SKU (Bất biến)</label>
                                <input
                                    className="adm-input"
                                    value={selectedProduct.sku}
                                    disabled
                                    style={{ background: '#f8fafc', cursor: 'not-allowed' }}
                                />
                            </div>
                            <div className="adm-field">
                                <label>Mã vạch (Barcode)</label>
                                <input
                                    className="adm-input"
                                    value={editForm.barcode}
                                    onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="adm-field-grid">
                            <div className="adm-field">
                                <label>Đơn vị tính</label>
                                <input
                                    className="adm-input"
                                    value={editForm.unit}
                                    onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                                />
                            </div>
                            <div className="adm-field">
                                <label>Kho lưu trữ</label>
                                <input
                                    className="adm-input"
                                    value={editForm.warehouseName}
                                    onChange={(e) => setEditForm({ ...editForm, warehouseName: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="adm-field-grid">
                            <div className="adm-field">
                                <label>Đơn giá niêm yết (VNĐ)</label>
                                <input
                                    className="adm-input"
                                    type="number"
                                    value={editForm.price}
                                    onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                                />
                            </div>
                            <div className="adm-field">
                                <label>Tồn kho tối thiểu (Cảnh báo)</label>
                                <input
                                    className="adm-input"
                                    type="number"
                                    value={editForm.minStock}
                                    onChange={(e) => setEditForm({ ...editForm, minStock: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
}
