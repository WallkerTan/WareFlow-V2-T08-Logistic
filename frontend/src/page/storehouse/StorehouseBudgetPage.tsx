import { useState } from 'react';
import type { FormEvent } from 'react';
import { Modal } from 'antd';
import { Wallet, Clock, CheckCircle2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDepots } from '../../data/warehouses';
import { budgetMoney, createBudgetRequest, useBudgetRequests } from '../../data/budgetRequests';
import BudgetRequestList from '../../components/workspace/BudgetRequestList';

export default function StorehouseBudgetPage() {
    const warehouses = useDepots().filter(w => w.status === 'active' && w.company);
    const requests = useBudgetRequests();
    const [warehouseId, setWarehouseId] = useState('');
    const warehouse = warehouses.find(w => w.id === warehouseId) || warehouses[0];
    const [open, setOpen] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [amount, setAmount] = useState('');
    const [purpose, setPurpose] = useState('');
    const [neededBy, setNeededBy] = useState('');
    const owned = requests.filter(r => r.warehouseId === warehouse?.id && r.company === warehouse?.company);
    const approved = owned.filter(r => r.status === 'approved');
    const pending = owned.filter(r => r.status === 'pending');
    const total = (items: typeof requests) => items.reduce((sum, r) => sum + r.amount, 0);
    const today = new Date();
    const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!warehouse) return;
        if (neededBy < minDate) { setError('Ngày cần cấp không được trước ngày hiện tại.'); return; }
        try {
            createBudgetRequest({ warehouseId: warehouse.id, warehouseName: warehouse.name, company: warehouse.company, amount: Number(amount), purpose, neededBy });
            setOpen(false); setNotice('Đã lưu yêu cầu chờ công ty duyệt trong bản demo.');
        } catch (e) { setError(e instanceof Error ? e.message : 'Không thể lưu yêu cầu. Vui lòng thử lại.'); }
    }
    return <div className="budget-page">
        <div className="wf-page-heading"><div><span className="wf-eyebrow">QUẢN LÝ TÀI CHÍNH KHO</span><h1>Ngân sách</h1><p>Theo dõi ngân sách được duyệt và đề xuất cấp thêm kinh phí vận hành.</p></div><button className="wf-button wf-button-primary" disabled={!warehouse} onClick={() => { setAmount(''); setPurpose(''); setNeededBy(''); setError(''); setOpen(true); }}><Plus size={16} />Yêu cầu cấp ngân sách</button></div>
        <section className="wf-card"><label className="wf-field"><span>Kho đang quản lý</span><select value={warehouse?.id || ''} disabled={!warehouses.length} onChange={e => { setWarehouseId(e.target.value); setNotice(''); }}><option value="" disabled>Chưa có kho đang hoạt động</option>{warehouses.map(w => <option value={w.id} key={w.id}>{w.id} · {w.name}</option>)}</select>{warehouse && <small>{warehouse.company} · {warehouse.address}</small>}</label></section>
        {notice && <div className="wf-notice" role="status">{notice}</div>}
        <div className="budget-overview"><article className="budget-stat"><CheckCircle2 size={22} /><span>Tổng ngân sách đã duyệt</span><strong>{budgetMoney(total(approved))}</strong><small>{approved.length} yêu cầu được công ty phê duyệt</small></article><article className="budget-stat"><Clock size={22} /><span>Đang đề nghị cấp</span><strong>{budgetMoney(total(pending))}</strong><small>{pending.length} yêu cầu đang chờ duyệt</small></article><article className="budget-stat"><Wallet size={22} /><span>Theo dõi yêu cầu</span><strong>{owned.length} yêu cầu</strong><Link className="budget-text-button" to="/storehouse/finance">Xem báo cáo thu chi →</Link></article></div>
        <BudgetRequestList requests={owned} />
        <p className="budget-note">Bản demo: chọn kho để xem thử. Yêu cầu được lưu trên trình duyệt và xuất hiện tại Trung tâm phê duyệt của Company trên cùng trình duyệt. Số tiền đã duyệt chưa phản ánh giải ngân hoặc số dư thực tế.</p>
        <Modal title="Yêu cầu cấp ngân sách" open={open && !!warehouse} onCancel={() => setOpen(false)} footer={null} width={600} destroyOnHidden><form className="budget-form" onSubmit={submit}>
            <div className="wf-notice">{warehouse?.name}<br />{warehouse?.company}</div>
            <label className="wf-field"><span>Số tiền đề nghị (VNĐ) *</span><input type="number" min="1" max={Number.MAX_SAFE_INTEGER} step="1" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="Ví dụ: 25000000" />{Number(amount) > 0 && <small>{budgetMoney(Number(amount))}</small>}</label>
            <label className="wf-field"><span>Ngày cần cấp *</span><input type="date" min={minDate} required value={neededBy} onChange={e => setNeededBy(e.target.value)} /></label>
            <label className="wf-field"><span>Mục đích sử dụng *</span><textarea required maxLength={1000} rows={4} value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="Mô tả khoản chi dự kiến, lý do và kế hoạch sử dụng ngân sách" /></label>
            {error && <p role="alert" className="budget-error">{error}</p>}
            <div className="budget-actions"><button type="button" className="wf-button wf-button-secondary" onClick={() => setOpen(false)}>Đóng</button><button type="submit" className="wf-button wf-button-primary">Gửi yêu cầu</button></div>
        </form></Modal>
    </div>;
}
