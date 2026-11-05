import { useState } from 'react';
import { AlertTriangle, ArrowDownToLine, ArrowRight, Boxes, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, Eye, Package, Search, Settings2, ShieldAlert } from 'lucide-react';
import { Modal } from 'antd';
import { availableQuantity, daysRemaining, lotStatus, products, stockLots as initialLots } from '../../data/stockLots';
import type { LotStatus, StockLot } from '../../data/stockLots';
import './stock-lots.css';

const labels: Record<LotStatus, string> = { ok: 'Bình thường', near_expiry: 'Sắp hết hạn', expired: 'Đã hết hạn', damaged: 'Hư hỏng' };
const number = (value: number) => value.toLocaleString('vi-VN');
const date = (value: string | null) => value ? value.split('-').reverse().join('/') : 'Không có HSD';
const productOf = (lot: StockLot) => products.find(product => product.id === lot.product_id)!;

export default function StockLots() {
    const [stockLots, setStockLots] = useState<StockLot[]>(initialLots);
    const [tab, setTab] = useState<'lots' | 'alerts'>('lots');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [productId, setProductId] = useState('all');
    const [threshold, setThreshold] = useState(30);
    const [draftThreshold, setDraftThreshold] = useState(30);
    const [settings, setSettings] = useState(false);
    const [selected, setSelected] = useState<StockLot | null>(null);
    const [page, setPage] = useState(1);
    const [notice, setNotice] = useState('');
    const [alertFilter, setAlertFilter] = useState('all');
    const near = stockLots.filter(lot => lotStatus(lot, threshold) === 'near_expiry');
    const expired = stockLots.filter(lot => lotStatus(lot, threshold) === 'expired');
    const damaged = stockLots.filter(lot => lotStatus(lot, threshold) === 'damaged');
    const low = products.map(product => ({ ...product, available: stockLots.filter(lot => lot.product_id === product.id).reduce((sum, lot) => sum + availableQuantity(lot, threshold), 0) })).filter(product => product.available < product.min_stock);
    const alerts = [
        ...expired.map(lot => ({ key: lot.id, type: 'expired', title: `${lot.lot_code} đã hết hạn sử dụng`, text: `${productOf(lot).name} · Hết hạn ${date(lot.expiry_date)} · Tồn ${number(lot.quantity)} ${productOf(lot).unit.toLowerCase()}`, advice: 'Cách ly hàng và lập phiếu xuất hủy hoặc trả nhà cung cấp.', lot })),
        ...damaged.map(lot => ({ key: lot.id, type: 'damaged', title: `${lot.lot_code} có hàng hư hỏng`, text: `${productOf(lot).name} · Tồn ${number(lot.quantity)} ${productOf(lot).unit.toLowerCase()}`, advice: 'Kiểm tra thực tế và xử lý qua phiếu kho.', lot })),
        ...low.map(product => ({ key: product.id, type: 'low', title: `${product.name} dưới tồn tối thiểu`, text: `${product.sku} · Khả dụng ${number(product.available)} / tối thiểu ${number(product.min_stock)} ${product.unit.toLowerCase()}`, advice: 'Cân nhắc tạo đơn đặt hàng để bổ sung tồn kho.', lot: null })),
        ...near.map(lot => ({ key: lot.id, type: 'near_expiry', title: `${lot.lot_code} sắp hết hạn sử dụng`, text: `${productOf(lot).name} · ${daysRemaining(lot.expiry_date!)} ngày còn lại · HSD ${date(lot.expiry_date)}`, advice: 'Ưu tiên xuất lô có hạn sử dụng gần nhất.', lot })),
    ];
    const filtered = stockLots.filter(lot => {
        const product = productOf(lot);
        const query = search.trim().toLocaleLowerCase('vi');
        return (status === 'all' || lotStatus(lot, threshold) === status) && (productId === 'all' || product.id === productId) && `${lot.lot_code} ${product.name} ${product.sku} ${product.barcode}`.toLocaleLowerCase('vi').includes(query);
    });
    const pageCount = Math.max(1, Math.ceil(filtered.length / 6));
    const currentPage = Math.min(page, pageCount);
    function showStatus(value: string) { setStatus(value); setPage(1); setTab('lots'); }
    function markDamaged() {
        if (!selected || selected.status === 'damaged') return;
        const updated: StockLot = { ...selected, status: 'damaged' };
        setStockLots(lots => lots.map(lot => lot.id === updated.id ? updated : lot));
        setSelected(updated);
        setNotice(`Đã đánh dấu ${updated.lot_code} là hàng lỗi/hỏng trong phiên xem trước. Chưa lưu lên hệ thống.`);
    }
    function exportCsv() {
        const rows = [['Mã lô', 'SKU', 'Sản phẩm', 'Đơn vị', 'Hạn sử dụng', 'Tồn thực tế', 'Đặt giữ', 'Khả dụng', 'Trạng thái'], ...filtered.map(lot => [lot.lot_code, productOf(lot).sku, productOf(lot).name, productOf(lot).unit, date(lot.expiry_date), lot.quantity, lot.reserved, availableQuantity(lot, threshold), labels[lotStatus(lot, threshold)]])];
        const blob = new Blob(['\uFEFF' + rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'wareflow-lo-hang.csv'; link.click(); URL.revokeObjectURL(url);
        setNotice(`Đã xuất ${filtered.length} lô hàng theo bộ lọc hiện tại.`);
    }
    return <div className="sl-page">
        <div className="sl-heading"><div><span className="sl-eyebrow">QUẢN LÝ TỒN KHO</span><h1>Lô hàng & cảnh báo</h1><p>Theo dõi từng lô hàng. Chủ động kiểm soát tồn kho và hạn sử dụng.</p></div><button className="sl-button" onClick={exportCsv}><ArrowDownToLine size={16} /> Xuất danh sách</button></div>
        <div className="sl-demo"><span className="sl-dot" /> Chế độ xem trước · Dữ liệu mẫu <span>Cảnh báo được tính theo ngày hiện tại</span></div>
        <div className="sl-stats">
            {[{ title: 'Tổng lô hàng', value: stockLots.length, sub: `${products.length} sản phẩm đang theo dõi`, icon: Boxes, tone: 'purple', action: () => showStatus('all') }, { title: 'Sắp hết hạn', value: near.length, sub: `Trong ${threshold} ngày tới`, icon: CalendarClock, tone: 'amber', action: () => showStatus('near_expiry') }, { title: 'Đã hết hạn', value: expired.length, sub: 'Cần kiểm tra và xử lý', icon: ShieldAlert, tone: 'red', action: () => showStatus('expired') }, { title: 'Dưới tồn tối thiểu', value: low.length, sub: 'Sản phẩm cần bổ sung', icon: Package, tone: 'blue', action: () => { setTab('alerts'); setAlertFilter('low'); } }].map(item => <button className={`sl-stat sl-${item.tone}`} key={item.title} onClick={item.action}><div><span>{item.title}</span><strong>{item.value.toString().padStart(2, '0')}</strong><small>{item.sub}</small></div><span className="sl-stat-icon"><item.icon size={22} /></span></button>)}
        </div>
        <div className="sl-warning"><AlertTriangle size={22} /><div><strong>{alerts.length} cảnh báo cần chú ý</strong><p>{near.length} lô sắp hết hạn, {expired.length} lô hết hạn, {damaged.length} lô hư hỏng và {low.length} sản phẩm dưới tồn tối thiểu.</p></div><button onClick={() => { setTab('alerts'); setAlertFilter('all'); }}>Xem cảnh báo <ArrowRight size={16} /></button></div>
        {notice && <div className="sl-notice" role="status">{notice}<button aria-label="Đóng thông báo" onClick={() => setNotice('')}>×</button></div>}
        <section className="sl-panel">
            <div className="sl-panel-top"><div className="sl-tabs" role="tablist" aria-label="Lô hàng và cảnh báo"><button role="tab" aria-selected={tab === 'lots'} onClick={() => setTab('lots')}>Danh sách lô hàng <span>{stockLots.length}</span></button><button role="tab" aria-selected={tab === 'alerts'} onClick={() => setTab('alerts')}>Cảnh báo <span className="sl-alert-count">{alerts.length}</span></button></div><button className="sl-config" onClick={() => { setDraftThreshold(threshold); setSettings(true); }}><Settings2 size={16} /> Cấu hình cảnh báo</button></div>
            {tab === 'lots' ? <>
                <div className="sl-filters"><label className="sl-search"><Search size={17} /><input aria-label="Tìm kiếm lô hàng" placeholder="Tìm mã lô, tên hàng, SKU, mã vạch..." value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></label><select aria-label="Lọc sản phẩm" value={productId} onChange={event => { setProductId(event.target.value); setPage(1); }}><option value="all">Tất cả sản phẩm</option>{products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select><select aria-label="Lọc trạng thái" value={status} onChange={event => showStatus(event.target.value)}><option value="all">Tất cả trạng thái</option>{Object.entries(labels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select>{(search || status !== 'all' || productId !== 'all') && <button className="sl-text-button" onClick={() => { setSearch(''); setStatus('all'); setProductId('all'); setPage(1); }}>Xóa bộ lọc</button>}</div>
                <div className="sl-table-wrap"><table><thead><tr><th>Mã lô / Sản phẩm</th><th>Hạn sử dụng</th><th className="sl-numeric">Tồn thực tế</th><th className="sl-numeric">Đặt giữ</th><th className="sl-numeric">Khả dụng</th><th>Trạng thái</th><th><span className="sl-sr-only">Thao tác</span></th></tr></thead><tbody>{filtered.slice((currentPage - 1) * 6, currentPage * 6).map(lot => { const product = productOf(lot); const state = lotStatus(lot, threshold); return <tr key={lot.id}><td><button className="sl-lot-link" onClick={() => setSelected(lot)}>{lot.lot_code}</button><strong className="sl-product-name">{product.name}</strong><small>{product.sku} <span>· {product.unit}</span></small></td><td className={state === 'expired' ? 'sl-date-expired' : state === 'near_expiry' ? 'sl-date-near' : ''}>{date(lot.expiry_date)}{lot.expiry_date && <small>{daysRemaining(lot.expiry_date) < 0 ? `Quá hạn ${Math.abs(daysRemaining(lot.expiry_date))} ngày` : `Còn ${daysRemaining(lot.expiry_date)} ngày`}</small>}</td><td className="sl-numeric">{number(lot.quantity)}</td><td className="sl-numeric sl-muted">{number(lot.reserved)}</td><td className="sl-numeric"><b>{number(availableQuantity(lot, threshold))}</b></td><td><span className={`sl-status sl-status-${state}`}><i />{labels[state]}</span></td><td><button className="sl-eye" aria-label={`Chi tiết ${lot.lot_code}`} onClick={() => setSelected(lot)}><Eye size={17} /></button></td></tr>; })}</tbody></table>{!filtered.length && <div className="sl-empty"><Search size={32} /><h3>Không tìm thấy lô hàng</h3><p>Thử thay đổi từ khóa hoặc bộ lọc.</p></div>}</div>
                <div className="sl-pagination"><span>{filtered.length ? `${(currentPage - 1) * 6 + 1}–${Math.min(currentPage * 6, filtered.length)} trong ${filtered.length} lô hàng` : '0 lô hàng'}</span><div><button aria-label="Trang trước" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /></button><span>Trang {currentPage} / {pageCount}</span><button aria-label="Trang sau" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} /></button></div></div>
            </> : <div className="sl-alerts"><div className="sl-alert-filters">{[['all', 'Tất cả'], ['expired', 'Hết hạn'], ['near_expiry', 'Sắp hết hạn'], ['low', 'Tồn thấp'], ['damaged', 'Hư hỏng']].map(([key, label]) => <button key={key} className={alertFilter === key ? 'active' : ''} onClick={() => setAlertFilter(key)}>{label}</button>)}</div>{alerts.filter(alert => alertFilter === 'all' || alert.type === alertFilter).map(alert => <article className={`sl-alert sl-alert-${alert.type}`} key={alert.key}><span className="sl-alert-icon"><AlertTriangle size={20} /></span><div><h3>{alert.title}</h3><p>{alert.text}</p><small>{alert.advice}</small></div><button onClick={() => { if (alert.lot) setSelected(alert.lot); else { setProductId(alert.key); setStatus('all'); setSearch(''); setPage(1); setTab('lots'); } }}>Xem chi tiết <ArrowRight size={15} /></button></article>)}{!alerts.some(alert => alertFilter === 'all' || alert.type === alertFilter) && <div className="sl-empty"><CheckCircle2 size={32} /><h3>Không có cảnh báo</h3><p>Không có mục nào thuộc nhóm này.</p></div>}</div>}
        </section>
        <p className="sl-footnote"><ShieldAlert size={15} /> Khả dụng = tồn thực tế − đặt giữ; lô hết hạn hoặc hư hỏng có khả dụng bằng 0. Cảnh báo tồn thấp tính trên tổng khả dụng của từng sản phẩm trong kho.</p>
        <Modal title={selected ? `Chi tiết lô ${selected.lot_code}` : ''} open={!!selected} onCancel={() => setSelected(null)} footer={<div className="sl-detail-actions"><button className="sl-button" disabled={selected?.status === 'damaged'} onClick={markDamaged}><ShieldAlert size={16} />{selected?.status === 'damaged' ? 'Đã đánh dấu lỗi/hỏng' : 'Đánh dấu hàng lỗi/hỏng'}</button><button className="sl-button" onClick={() => setSelected(null)}>Đóng</button></div>}><p className="sl-modal-intro">Thông tin truy vết lô hàng · Dữ liệu mẫu</p>{selected && <><div className="sl-detail-grid">{[['Sản phẩm', productOf(selected).name], ['SKU', productOf(selected).sku], ['Mã vạch', productOf(selected).barcode], ['Đơn vị tính', productOf(selected).unit], ['Ngày tạo', date(selected.created_at)], ['Hạn sử dụng', date(selected.expiry_date)], ['Tồn thực tế', number(selected.quantity)], ['Đang đặt giữ', number(selected.reserved)], ['Khả dụng', number(availableQuantity(selected, threshold))], ['Trạng thái', labels[lotStatus(selected, threshold)]]].map(([key, value]) => <div key={key}><span>{key}</span><strong>{value}</strong></div>)}</div><div className="sl-detail-note">Biến động tồn kho và xử lý hàng lỗi phải thực hiện qua phiếu kho. Không sửa trực tiếp số lượng lô hàng.</div></>}</Modal>
        <Modal title="Cấu hình cảnh báo" open={settings} onCancel={() => setSettings(false)} onOk={() => { setThreshold(draftThreshold); setSettings(false); setPage(1); setNotice('Đã áp dụng ngưỡng cảnh báo cho phiên xem trước.'); }} okText="Áp dụng" cancelText="Hủy" okButtonProps={{ disabled: !Number.isInteger(draftThreshold) || draftThreshold < 1 || draftThreshold > 365 }}><div className="sl-settings"><label htmlFor="expiry-threshold">Cảnh báo trước hạn sử dụng (ngày)</label><input id="expiry-threshold" type="number" min={1} max={365} value={Number.isNaN(draftThreshold) ? '' : draftThreshold} onChange={event => setDraftThreshold(event.target.valueAsNumber)} /><p>Nhập từ 1 đến 365 ngày. Ngày hết hạn vẫn được tính là sắp hết hạn; từ ngày kế tiếp được tính là hết hạn.</p><p>Tồn tối thiểu lấy theo trường min_stock của từng sản phẩm. Cấu hình chỉ áp dụng trong phiên hiện tại.</p></div></Modal>
    </div>;
}

