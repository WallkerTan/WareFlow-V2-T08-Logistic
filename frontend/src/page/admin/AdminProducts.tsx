import { useMemo, useState } from 'react';
import { AlertTriangle, Boxes, Download, Package, Plus, Search } from 'lucide-react';
import { Card, EmptyState, Pagination } from '../../components/admin/AdminUI';
import { products } from '../../data/adminData';
import { formatCurrency, formatNumber, formatRelativeTime } from '../../utils/format';

const PAGE_SIZE = 6;

export default function AdminProducts() {
    const [query, setQuery] = useState('');
    const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW' | 'OK'>('ALL');
    const [page, setPage] = useState(1);

    const filtered = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        return products.filter((product) => {
            const matchesQuery =
                !keyword ||
                product.name.toLowerCase().includes(keyword) ||
                product.sku.toLowerCase().includes(keyword) ||
                product.barcode.includes(keyword);
            const isLow = product.stock < product.minStock;
            const matchesStock = stockFilter === 'ALL' || (stockFilter === 'LOW' ? isLow : !isLow);
            return matchesQuery && matchesStock;
        });
    }, [query, stockFilter]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, pageCount);
    const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    function updateFilter<T>(setter: (value: T) => void) {
        return (value: T) => {
            setter(value);
            setPage(1);
        };
    }

    const lowStockCount = products.filter((product) => product.stock < product.minStock).length;
    const totalValue = products.reduce((sum, product) => sum + product.stock * product.price, 0);

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
                    <div className="adm-stat-value">{formatNumber(products.length)}</div>
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
                                        <tr key={product.id}>
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
        </>
    );
}
