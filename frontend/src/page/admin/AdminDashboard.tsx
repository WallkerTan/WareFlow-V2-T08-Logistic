import { useMemo, useState } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import {
    ArrowRight,
    Building2,
    Clock,
    FileText,
    Package,
    RefreshCw,
    TrendingUp,
    Truck,
    Users,
    Warehouse,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Card, Progress, StatCard } from '../../components/admin/AdminUI';
import { companies, notifications, products, shipments, systemLogs, transactions, users, warehouses } from '../../data/adminData';
import {
    companyStatusMeta,
    formatCompactCurrency,
    formatCurrency,
    formatDateTime,
    formatNumber,
    formatRelativeTime,
    shipmentStatusMeta,
} from '../../utils/format';

const revenueTrend = [
    { month: 'T5', revenue: 312, expense: 186 },
    { month: 'T6', revenue: 358, expense: 204 },
    { month: 'T7', revenue: 331, expense: 192 },
    { month: 'T8', revenue: 402, expense: 228 },
    { month: 'T9', revenue: 447, expense: 241 },
    { month: 'T10', revenue: 512, expense: 268 },
];

const warehouseLoad = [
    { name: 'Bình Dương', value: 91, label: 'Kho Đông Á' },
    { name: 'Quận 7', value: 82, label: 'Kho trung chuyển' },
    { name: 'Thủ Đức', value: 64, label: 'Kho lạnh' },
    { name: 'Long An', value: 58, label: 'Kho nông sản' },
    { name: 'Quận 10', value: 47, label: 'Kho công nghệ' },
];

const companyDistribution = [
    { name: 'Hoạt động', value: 4, color: '#4567ed' },
    { name: 'Chờ duyệt', value: 2, color: '#d99220' },
    { name: 'Đã khoá', value: 2, color: '#d34b58' },
];

const donutColors = companyDistribution.map((entry) => entry.color);

export default function AdminDashboard() {
    const [range, setRange] = useState<'30' | '90' | '365'>('90');

    const metrics = useMemo(() => {
        const activeCompanies = companies.filter((company) => company.status === 'ACTIVE').length;
        const pendingCompanies = companies.filter((company) => company.status === 'PENDING').length;
        const activeWarehouses = warehouses.filter((warehouse) => warehouse.status === 'ACTIVE').length;
        const lowStock = products.filter((product) => product.stock < product.minStock).length;
        const inTransit = shipments.filter((shipment) => shipment.status === 'IN_TRANSIT').length;
        const totalRevenue = transactions
            .filter((transaction) => transaction.type === 'INCOME')
            .reduce((sum, transaction) => sum + transaction.amount, 0);
        const totalExpense = transactions
            .filter((transaction) => transaction.type !== 'INCOME')
            .reduce((sum, transaction) => sum + transaction.amount, 0);
        return {
            activeCompanies,
            pendingCompanies,
            activeWarehouses,
            lowStock,
            inTransit,
            totalRevenue,
            totalExpense,
            margin: Math.round(((totalRevenue - totalExpense) / totalRevenue) * 100),
        };
    }, []);

    const recentCompanies = companies.slice(0, 5);
    const recentLogs = systemLogs.slice(0, 5);
    const pendingShipments = shipments.filter((shipment) => shipment.status === 'CREATED' || shipment.status === 'IN_TRANSIT');
    const unreadNotifications = notifications.filter((item) => !item.isRead);

    return (
        <>
            <div className="admin-page-head">
                <div>
                    <h2>Tổng quan hoạt động</h2>
                    <p>Theo dõi sức khoẻ toàn bộ hệ sinh thái WareFlow trong thời gian thực.</p>
                </div>
                <div className="admin-page-actions">
                    <select className="adm-select" value={range} onChange={(event) => setRange(event.target.value as typeof range)} aria-label="Khoảng thời gian">
                        <option value="30">30 ngày gần nhất</option>
                        <option value="90">90 ngày gần nhất</option>
                        <option value="365">12 tháng gần nhất</option>
                    </select>
                    <button className="adm-btn">
                        <RefreshCw size={15} /> Làm mới
                    </button>
                    <Link to="/admin/companies" className="adm-btn adm-btn-primary">
                        <Building2 size={15} /> Quản lý công ty
                    </Link>
                </div>
            </div>

            <div className="adm-stats">
                <StatCard
                    label="Tổng doanh nghiệp"
                    value={formatNumber(companies.length)}
                    icon={<Building2 size={17} />}
                    tone="info"
                    trend={`${metrics.pendingCompanies} chờ duyệt`}
                    footnote="cần phê duyệt"
                />
                <StatCard
                    label="Người dùng hoạt động"
                    value={formatNumber(users.length * 16)}
                    icon={<Users size={17} />}
                    tone="success"
                    trend="8.4%"
                    footnote="so với tháng trước"
                />
                <StatCard
                    label="Kho đang vận hành"
                    value={formatNumber(metrics.activeWarehouses)}
                    icon={<Warehouse size={17} />}
                    tone="purple"
                    trend={`${warehouses.length} tổng`}
                    footnote="toàn hệ thống"
                />
                <StatCard
                    label="Cảnh báo tồn kho"
                    value={formatNumber(metrics.lowStock)}
                    icon={<Package size={17} />}
                    tone="warning"
                    trend="3 mã"
                    trendDirection="down"
                    footnote="dưới mức tối thiểu"
                />
            </div>

            <div className="adm-grid-2">
                <Card
                    title="Biểu đồ doanh thu và chi phí"
                    subtitle={`Đơn vị: triệu đồng · ${range === '30' ? '30' : range === '90' ? '90' : '365'} ngày gần nhất`}
                    action={
                        <div className="adm-chart-legend">
                            <span>
                                <i style={{ background: '#4567ed' }} /> Doanh thu
                            </span>
                            <span>
                                <i style={{ background: '#f0a5ae' }} /> Chi phí
                            </span>
                        </div>
                    }
                >
                    <div className="adm-chart-box">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueTrend} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="admRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#4567ed" stopOpacity={0.26} />
                                        <stop offset="100%" stopColor="#4567ed" stopOpacity={0.02} />
                                    </linearGradient>
                                    <linearGradient id="admExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f0a5ae" stopOpacity={0.24} />
                                        <stop offset="100%" stopColor="#f0a5ae" stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" vertical={false} />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9aa4b6' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#9aa4b6' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: 10,
                                        border: '1px solid #e6eaf2',
                                        fontSize: 12,
                                        boxShadow: '0 12px 28px -14px rgba(23,33,57,.35)',
                                    }}
                                    formatter={(value: number | string, name: string) => [`${formatNumber(Number(value))} tr`, name === 'revenue' ? 'Doanh thu' : 'Chi phí']}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#4567ed" strokeWidth={2.2} fill="url(#admRevenue)" />
                                <Area type="monotone" dataKey="expense" stroke="#f0a5ae" strokeWidth={2} fill="url(#admExpense)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card title="Phân bố doanh nghiệp" subtitle="Theo trạng thái phê duyệt">
                    <div className="adm-donut-wrap">
                        <div className="adm-donut">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={companyDistribution}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius={54}
                                        outerRadius={76}
                                        paddingAngle={3}
                                        stroke="none"
                                    >
                                        {companyDistribution.map((entry, index) => (
                                            <Cell key={entry.name} fill={donutColors[index]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: 10, border: '1px solid #e6eaf2', fontSize: 12 }}
                                        formatter={(value: number | string) => [`${value} công ty`]}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="adm-donut-center">
                                <strong>{companies.length}</strong>
                                <small>doanh nghiệp</small>
                            </div>
                        </div>
                        <div className="adm-donut-legend">
                            {companyDistribution.map((entry) => (
                                <div className="adm-donut-legend-row" key={entry.name}>
                                    <i style={{ background: entry.color }} />
                                    <span>{entry.name}</span>
                                    <strong>{entry.value}</strong>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="adm-section-gap" style={{ marginTop: 20, marginBottom: 0 }}>
                        <div className="adm-inline-note is-warning">
                            <Clock size={15} />
                            <span>
                                Có <strong>{metrics.pendingCompanies} doanh nghiệp</strong> đang chờ phê duyệt và{' '}
                                <strong>{unreadNotifications.length} thông báo</strong> chưa được xử lý.
                            </span>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="adm-grid-equal">
                <Card
                    title="Tải trọng kho hàng"
                    subtitle="Tỷ lệ sử dụng sức chứa hiện tại"
                    action={
                        <Link to="/admin/warehouses" className="adm-link" style={{ fontSize: 12 }}>
                            Xem tất cả
                        </Link>
                    }
                >
                    <div className="adm-chart-box" style={{ height: 232 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={warehouseLoad} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" horizontal={false} />
                                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10.5, fill: '#9aa4b6' }} axisLine={false} tickLine={false} tickFormatter={(value: number) => `${value}%`} />
                                <YAxis type="category" dataKey="label" width={104} tick={{ fontSize: 11, fill: '#738096' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    cursor={{ fill: '#f6f8fc' }}
                                    contentStyle={{ borderRadius: 10, border: '1px solid #e6eaf2', fontSize: 12 }}
                                    formatter={(value: number | string) => [`${value}%`, 'Tải trọng']}
                                />
                                <Bar dataKey="value" radius={[0, 5, 5, 0]} barSize={16}>
                                    {warehouseLoad.map((entry) => (
                                        <Cell key={entry.name} fill={entry.value >= 85 ? '#d34b58' : entry.value >= 60 ? '#d99220' : '#4567ed'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card
                    title="Hoạt động gần đây"
                    subtitle="Nhật ký thao tác trên hệ thống"
                    action={
                        <Link to="/admin/logs" className="adm-link" style={{ fontSize: 12 }}>
                            Xem nhật ký
                        </Link>
                    }
                >
                    <ul className="adm-timeline">
                        {recentLogs.map((entry) => (
                            <li key={entry.id}>
                                <span className="adm-timeline-dot">
                                    <FileText size={13} />
                                </span>
                                <div className="adm-timeline-body">
                                    <strong>{entry.action}</strong>
                                    <p>
                                        {entry.actorName} · {entry.target}
                                    </p>
                                    <small>{formatRelativeTime(entry.createdAt)}</small>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            </div>

            <div className="adm-grid-equal">
                <Card
                    title="Doanh nghiệp mới đăng ký"
                    subtitle="Cập nhật gần nhất từ hệ thống"
                    action={
                        <Link to="/admin/companies" className="adm-link" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            Xem tất cả <ArrowRight size={13} />
                        </Link>
                    }
                    bodyClassName=""
                >
                    <div className="adm-table-wrap">
                        <table className="adm-table" style={{ minWidth: 520 }}>
                            <thead>
                                <tr>
                                    <th>Doanh nghiệp</th>
                                    <th>Mô hình</th>
                                    <th>Trạng thái</th>
                                    <th>Ngày tạo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentCompanies.map((company) => {
                                    const status = companyStatusMeta[company.status];
                                    return (
                                        <tr key={company.id}>
                                            <td>
                                                <span className="adm-cell-main">{company.name}</span>
                                                <span className="adm-cell-sub">{company.taxCode}</span>
                                            </td>
                                            <td>{company.businessModel}</td>
                                            <td>
                                                <Badge label={status.label} tone={status.tone} />
                                            </td>
                                            <td className="adm-muted">{formatDateTime(company.createdAt)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card
                    title="Đơn vận chuyển đang xử lý"
                    subtitle={`${pendingShipments.length} đơn đang chờ hoàn tất`}
                    action={
                        <Link to="/admin/shipments" className="adm-link" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            Xem tất cả <ArrowRight size={13} />
                        </Link>
                    }
                    bodyClassName=""
                >
                    <div className="adm-table-wrap">
                        <table className="adm-table" style={{ minWidth: 520 }}>
                            <thead>
                                <tr>
                                    <th>Mã vận đơn</th>
                                    <th>Đơn vị vận chuyển</th>
                                    <th>Trạng thái</th>
                                    <th className="adm-text-right">COD</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingShipments.map((shipment) => {
                                    const status = shipmentStatusMeta[shipment.status];
                                    return (
                                        <tr key={shipment.id}>
                                            <td>
                                                <span className="adm-cell-main adm-mono">{shipment.trackingCode}</span>
                                                <span className="adm-cell-sub">{shipment.destination}</span>
                                            </td>
                                            <td>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                                    <Truck size={14} className="adm-muted" />
                                                    {shipment.carrier}
                                                </span>
                                            </td>
                                            <td>
                                                <Badge label={status.label} tone={status.tone} />
                                            </td>
                                            <td className="adm-text-right adm-cell-main">{formatCompactCurrency(shipment.codAmount)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            <div className="adm-grid-equal">
                <Card title="Ngân sách tháng 10/2026" subtitle="So sánh hạn mức và chi phí thực tế">
                    <ul className="adm-list" style={{ margin: -18, marginTop: -18 }}>
                        {[
                            { label: 'Tổng công ty', budget: 900_000_000, spent: 512_300_000 },
                            { label: 'Kho trung chuyển quận 7', budget: 240_000_000, spent: 168_400_000 },
                            { label: 'Kho lạnh Thủ Đức', budget: 120_000_000, spent: 86_900_000 },
                            { label: 'Kho tổng Đông Á Bình Dương', budget: 380_000_000, spent: 341_600_000 },
                        ].map((row) => {
                            const percent = Math.round((row.spent / row.budget) * 100);
                            return (
                                <li className="adm-list-item" key={row.label}>
                                    <div className="adm-list-text">
                                        <strong>{row.label}</strong>
                                        <div className="adm-progress-row" style={{ marginTop: 8 }}>
                                            <Progress value={percent} tone={percent >= 90 ? 'danger' : percent >= 70 ? 'warning' : 'success'} />
                                            <span>{percent}%</span>
                                        </div>
                                    </div>
                                    <div className="adm-list-meta">
                                        <strong>{formatCompactCurrency(row.spent)}</strong>
                                        <small>trên {formatCompactCurrency(row.budget)}</small>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </Card>

                <Card title="Tổng quan tài chính" subtitle="Tích lũy trong kỳ báo cáo">
                    <ul className="adm-list" style={{ margin: -18, marginTop: -18 }}>
                        <li className="adm-list-item">
                            <span className="adm-list-icon is-success">
                                <TrendingUp size={16} />
                            </span>
                            <div className="adm-list-text">
                                <strong>Tổng doanh thu</strong>
                                <small>Từ bán hàng và dịch vụ</small>
                            </div>
                            <div className="adm-list-meta">
                                <strong className="adm-text-success">{formatCurrency(metrics.totalRevenue)}</strong>
                            </div>
                        </li>
                        <li className="adm-list-item">
                            <span className="adm-list-icon is-danger">
                                <Package size={16} />
                            </span>
                            <div className="adm-list-text">
                                <strong>Tổng chi phí</strong>
                                <small>Nhập hàng, chuyển kho và phí hệ thống</small>
                            </div>
                            <div className="adm-list-meta">
                                <strong className="adm-text-danger">{formatCurrency(metrics.totalExpense)}</strong>
                            </div>
                        </li>
                        <li className="adm-list-item">
                            <span className="adm-list-icon">
                                <TrendingUp size={16} />
                            </span>
                            <div className="adm-list-text">
                                <strong>Biên lợi nhuận gộp</strong>
                                <small>Sau khi trừ toàn bộ chi phí vận hành</small>
                            </div>
                            <div className="adm-list-meta">
                                <strong>{metrics.margin}%</strong>
                            </div>
                        </li>
                        <li className="adm-list-item">
                            <span className="adm-list-icon is-warning">
                                <Truck size={16} />
                            </span>
                            <div className="adm-list-text">
                                <strong>Đơn đang vận chuyển</strong>
                                <small>Cần theo dõi để đảm bảo giao đúng hạn</small>
                            </div>
                            <div className="adm-list-meta">
                                <strong>{metrics.inTransit}</strong>
                            </div>
                        </li>
                    </ul>
                </Card>
            </div>
        </>
    );
}
