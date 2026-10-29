import { useMemo, useState } from 'react';
import { Download, Mail, Phone, Plus, Search, Truck } from 'lucide-react';
import { Card, EmptyState, Pagination } from '../../components/admin/AdminUI';
import { suppliers } from '../../data/adminData';
import { formatDate, formatNumber } from '../../utils/format';

const PAGE_SIZE = 6;

export default function AdminSuppliers() {
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);

    const filtered = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        return suppliers.filter(
            (supplier) =>
                !keyword ||
                supplier.name.toLowerCase().includes(keyword) ||
                supplier.category.toLowerCase().includes(keyword) ||
                supplier.companyName.toLowerCase().includes(keyword),
        );
    }, [query]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, pageCount);
    const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    function updateFilter<T>(setter: (value: T) => void) {
        return (value: T) => {
            setter(value);
            setPage(1);
        };
    }

    const categories = new Set(suppliers.map((supplier) => supplier.category)).size;

    return (
        <>
            <div className="admin-page-head">
                <div>
                    <h2>Nhà cung cấp</h2>
                    <p>Quản lý đối tác cung ứng, danh mục sản phẩm và thông tin liên hệ trên toàn hệ thống.</p>
                </div>
                <div className="admin-page-actions">
                    <button className="adm-btn">
                        <Download size={15} /> Xuất CSV
                    </button>
                    <button className="adm-btn adm-btn-primary">
                        <Plus size={16} /> Thêm nhà cung cấp
                    </button>
                </div>
            </div>

            <div className="adm-stats">
                <article className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">Tổng nhà cung cấp</span>
                        <span className="adm-stat-icon">
                            <Truck size={17} />
                        </span>
                    </div>
                    <div className="adm-stat-value">{suppliers.length}</div>
                    <div className="adm-stat-foot">
                        <span>Đang hoạt động trên nền tảng</span>
                    </div>
                </article>
                <article className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">Nhóm ngành hàng</span>
                        <span className="adm-stat-icon is-purple">
                            <Truck size={17} />
                        </span>
                    </div>
                    <div className="adm-stat-value">{categories}</div>
                    <div className="adm-stat-foot">
                        <span>Phân loại theo danh mục</span>
                    </div>
                </article>
                <article className="adm-stat">
                    <div className="adm-stat-top">
                        <span className="adm-stat-label">Tổng sản phẩm</span>
                        <span className="adm-stat-icon is-success">
                            <Truck size={17} />
                        </span>
                    </div>
                    <div className="adm-stat-value">{formatNumber(suppliers.reduce((sum, supplier) => sum + supplier.productCount, 0))}</div>
                    <div className="adm-stat-foot">
                        <span>Đang được cung ứng</span>
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
                            placeholder="Tìm theo tên, ngành hàng, công ty…"
                            value={query}
                            onChange={(event) => updateFilter(setQuery)(event.target.value)}
                            aria-label="Tìm kiếm nhà cung cấp"
                        />
                    </label>
                    <div className="adm-toolbar-right">
                        <span className="adm-count">{filtered.length} đối tác</span>
                    </div>
                </div>

                {visible.length === 0 ? (
                    <EmptyState
                        icon={<Truck size={22} />}
                        title="Không tìm thấy nhà cung cấp"
                        description="Không có đối tác nào khớp với từ khoá tìm kiếm hiện tại."
                    />
                ) : (
                    <div className="adm-table-wrap">
                        <table className="adm-table">
                            <thead>
                                <tr>
                                    <th>Nhà cung cấp</th>
                                    <th>Ngành hàng</th>
                                    <th>Công ty liên kết</th>
                                    <th>Người liên hệ</th>
                                    <th>Liên hệ</th>
                                    <th className="adm-text-right">Sản phẩm</th>
                                    <th>Ngày tạo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((supplier) => (
                                    <tr key={supplier.id}>
                                        <td className="adm-cell-main">{supplier.name}</td>
                                        <td>{supplier.category}</td>
                                        <td>{supplier.companyName}</td>
                                        <td>{supplier.contactPerson}</td>
                                        <td>
                                            <span className="adm-cell-sub" style={{ marginTop: 0 }}>
                                                <Phone size={11} style={{ verticalAlign: -1 }} /> {supplier.phone}
                                            </span>
                                            <span className="adm-cell-sub">
                                                <Mail size={11} style={{ verticalAlign: -1 }} /> {supplier.email}
                                            </span>
                                        </td>
                                        <td className="adm-text-right adm-cell-main">{formatNumber(supplier.productCount)}</td>
                                        <td className="adm-muted">{formatDate(supplier.createdAt)}</td>
                                    </tr>
                                ))}
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
