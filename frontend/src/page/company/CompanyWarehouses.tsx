import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDepots } from '../../data/warehouses';
import type { Depot } from '../../data/warehouses';
import { Modal } from 'antd';
import warehousePhoto from '../../assets/warehouse-photo.jpg';
import { Warehouse, MapPin, Building2, Boxes, Wallet, History, ArrowUpRight } from 'lucide-react';
import './company-warehouses.css';

export default function CompanyWarehouses() {
 const [query, setQuery] = useState('');
 const [selected, setSelected] = useState<Depot | null>(null);
 const warehouses = useDepots();
 const [params, setParams] = useSearchParams();
 const companies = [...new Set(warehouses.map(w => w.company).filter(Boolean))].sort();
 const company = params.get('company') || companies.find(c => c.endsWith('GreenMart')) || companies[0] || '';
 const selectedWarehouse = selected ? warehouses.find(w => w.id === selected.id && w.company === company && w.status === 'active') : null;
 const owned = warehouses.filter(w => w.company === company && w.status === 'active');
 const filtered = owned.filter(w => `${w.name} ${w.id} ${w.address}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')));
 return <>
 <div className="wf-page-heading"><div><span className="wf-eyebrow">KHÔNG GIAN CÔNG TY</span><h1>Kho của công ty</h1><p>Các kho công ty đã mua hoặc thuê và được bàn giao quản lý.</p></div><Link className="wf-button wf-button-secondary" to={"/company/profile?company=" + encodeURIComponent(company)}>Hồ sơ công ty</Link></div>
 <div className="wf-profile-banner"><div><h2>{company || 'Chưa có công ty'}</h2><p>{owned.length} kho đang quản lý · {owned.reduce((sum, w) => sum + w.area, 0).toLocaleString('vi-VN')} m² tổng diện tích</p></div><span className="wf-status">Công ty mẫu</span></div>
 <section className="wf-card"><label className="wf-field" style={{ marginBottom: 22 }}><span>Chọn công ty để xem thử</span><select aria-label="Công ty xem thử" value={company} onChange={e => { setParams({ company: e.target.value }); setSelected(null); setQuery(''); }}>{companies.map(c => <option key={c} value={c}>{c}</option>)}</select><small>Bản demo: chọn công ty nhận bàn giao. Khi kết nối đăng nhập, công ty được xác định theo tài khoản.</small></label><div className="wf-section-heading"><div><h2>Danh sách kho đã bàn giao</h2><p>Chỉ hiển thị kho của công ty hiện tại.</p></div></div><label className="wf-field" style={{ marginBottom: 22 }}><span>Tìm kho</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tên kho, mã kho hoặc địa chỉ" /></label>
 <div className="company-warehouse-grid">{filtered.map(w => <article className="company-warehouse-card" key={w.id}>
 <div className="company-warehouse-cover"><img src={`https://images.unsplash.com/${w.image}?auto=format&fit=crop&w=900&q=80`} onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = warehousePhoto; }} alt={w.name} loading="lazy" /><span>Đang hoạt động</span></div>
 <div className="company-warehouse-body"><div className="company-warehouse-meta"><span>{w.id} · {w.region}</span><span>{w.type}</span></div><h2>{w.name}</h2><p>{w.address}</p>
 <dl className="company-warehouse-facts"><div><dt>Diện tích kho</dt><dd>{w.area.toLocaleString('vi-VN')} m²</dd></div><div><dt>{w.type === 'Cho thuê' ? 'Giá thuê / tháng' : 'Giá mua'}</dt><dd>{w.price.toLocaleString('vi-VN')} triệu đồng</dd></div></dl>
 <button className="wf-button wf-button-primary" onClick={() => setSelected(w)}>Xem chi tiết kho</button></div></article>)}</div>{!filtered.length && <div className="company-warehouse-empty"><strong>Chưa có kho phù hợp</strong><p>{query ? 'Thử tìm kiếm theo tên, mã kho hoặc địa chỉ khác.' : 'Công ty chưa có kho đang hoạt động được bàn giao.'}</p></div>}</section>
 <p className="wf-preview-note">Dữ liệu kho đồng bộ với trang quản trị trên cùng trình duyệt. Phân quyền và dữ liệu vận hành cần được kết nối với backend.</p>
 <Modal className="warehouse-detail-modal" open={!!selectedWarehouse} onCancel={() => setSelected(null)} footer={null} title="Thông tin kho" width={800} centered>{selectedWarehouse && <div className="warehouse-detail">
 <div className="warehouse-detail-hero"><span className="warehouse-detail-icon"><Warehouse size={28} /></span><div><span className="warehouse-detail-code">{selectedWarehouse.id} · {selectedWarehouse.region}</span><h2>{selectedWarehouse.name}</h2><p><MapPin size={14} />{selectedWarehouse.address}</p></div><span className="warehouse-detail-status">Đang hoạt động</span></div>
 <dl className="warehouse-detail-stats"><div><dt>Diện tích sử dụng</dt><dd>{selectedWarehouse.area.toLocaleString('vi-VN')} <small>m²</small></dd></div><div><dt>{selectedWarehouse.type === 'Cho thuê' ? 'Giá thuê / tháng' : 'Giá mua'}</dt><dd>{selectedWarehouse.price.toLocaleString('vi-VN')} <small>triệu đồng</small></dd></div><div><dt>Hình thức sở hữu</dt><dd>{selectedWarehouse.type}</dd></div></dl>
 <div className="warehouse-detail-owner"><Building2 size={20} /><div><span>Công ty quản lý</span><strong>{selectedWarehouse.company}</strong></div></div>
 <div className="warehouse-detail-sections">
 <section><h3><Building2 size={18} />Sở hữu & bàn giao</h3><dl><div><dt>Nhân viên quản lý</dt><dd>Chưa có dữ liệu</dd></div><div><dt>Thời gian bàn giao</dt><dd>Chưa có dữ liệu</dd></div><div><dt>Hồ sơ hợp đồng</dt><dd>Chưa có dữ liệu</dd></div></dl></section>
 <section><h3><Boxes size={18} />Hàng hóa & tồn kho</h3><p>Theo dõi sản phẩm, lô hàng và số lượng tồn tại kho.</p><span className="warehouse-detail-pending">Chưa kết nối dữ liệu</span></section>
 <section><h3><Wallet size={18} />Ngân sách & thu chi</h3><p>Thông tin ngân sách được cấp, thu chi và số dư của kho.</p><span className="warehouse-detail-pending">Chưa có dữ liệu</span></section>
 <section><h3><History size={18} />Lịch sử vận hành</h3><p>Các hoạt động nhập, xuất, điều chuyển và kiểm kê.</p><span className="warehouse-detail-pending">Chưa có dữ liệu</span></section>
 </div><div className="warehouse-detail-footer"><span>Thông tin kho đang được công ty quản lý.</span><button type="button" onClick={() => setSelected(null)}>Đóng chi tiết<ArrowUpRight size={15} /></button></div>
 </div>}</Modal>
 </>;
}
