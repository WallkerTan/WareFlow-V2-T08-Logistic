import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDepots } from '../../data/warehouses';
import type { Depot } from '../../data/warehouses';
import { Modal } from 'antd';

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
 <div style={{ display: 'grid', gap: 16 }}>{filtered.map(w => <article className="wf-card" key={w.id}><h2 style={{ fontSize: 17 }}>{w.name}</h2><p>{w.id} · Đang hoạt động · {w.type}</p><p style={{ color: '#7c8798' }}>{w.address}</p><p>{w.area.toLocaleString('vi-VN')} m² · {w.price.toLocaleString('vi-VN')} triệu đồng{w.type === 'Cho thuê' ? '/tháng' : ''}</p><button className="wf-button wf-button-primary" onClick={() => setSelected(w)}>Xem thông tin kho chi tiết</button></article>)}</div>{!filtered.length && <p>Không có kho phù hợp.</p>}</section>
 <p className="wf-preview-note">Dữ liệu kho đồng bộ với trang quản trị trên cùng trình duyệt. Phân quyền và dữ liệu vận hành cần được kết nối với backend.</p>
 <Modal open={!!selectedWarehouse} onCancel={() => setSelected(null)} footer={null} title="Chi tiết kho công ty" width={650}>{selectedWarehouse && <div style={{ lineHeight: 1.9 }}><h2>{selectedWarehouse.name}</h2><p>{selectedWarehouse.id} · Đang hoạt động</p><p><b>Công ty quản lý:</b> {selectedWarehouse.company}<br /><b>Địa chỉ:</b> {selectedWarehouse.address}<br /><b>Diện tích:</b> {selectedWarehouse.area.toLocaleString('vi-VN')} m²<br /><b>Hình thức:</b> {selectedWarehouse.type}<br /><b>Giá:</b> {selectedWarehouse.price.toLocaleString('vi-VN')} triệu đồng{selectedWarehouse.type === 'Cho thuê' ? '/tháng' : ''}</p><hr /><h3>Sở hữu & bàn giao</h3><p>Nhân viên quản lý: Chưa có dữ liệu<br />Thời gian bàn giao: Chưa có dữ liệu<br />Hồ sơ hợp đồng: Chưa có dữ liệu</p><h3>Hàng hóa & tồn kho</h3><p>Chưa kết nối dữ liệu sản phẩm, số lượng tồn, lô hàng, hạn sử dụng và cảnh báo tồn tối thiểu.</p><h3>Ngân sách & thu chi</h3><p>Chưa có dữ liệu ngân sách được cấp, tổng thu, tổng chi và ngân sách còn lại.</p><h3>Lịch sử vận hành</h3><p>Chưa có dữ liệu phiếu nhập, xuất, điều chuyển và kiểm kê.</p></div>}</Modal>
 </>;
}
