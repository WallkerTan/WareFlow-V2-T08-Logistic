import { useState } from 'react';
import { Modal } from 'antd';
import { budgetMoney, budgetStatus, resolveBudgetRequest } from '../../data/budgetRequests';
import type { BudgetRequest } from '../../data/budgetRequests';
import './budget.css';

export default function BudgetRequestList({ requests, companyView = false }: { requests: BudgetRequest[]; companyView?: boolean }) {
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('all');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [response, setResponse] = useState('');
    const [error, setError] = useState('');
    const selected = requests.find(r => r.id === selectedId);
    const filtered = requests.filter(r => (status === 'all' || r.status === status) && `${r.id} ${r.warehouseName} ${r.purpose}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')));
    function resolve(next: 'approved' | 'rejected' | 'cancelled') {
        if (!selected) return;
        try { resolveBudgetRequest(selected.id, next, response); setSelectedId(null); setError(''); }
        catch (e) { setError(e instanceof Error ? e.message : 'Không thể lưu thay đổi.'); }
    }
    return <section className="wf-card budget-requests">
        <div className="wf-section-heading"><div><h2>{companyView ? 'Yêu cầu ngân sách từ kho' : 'Lịch sử yêu cầu ngân sách'}</h2><p>{requests.length} yêu cầu · Chọn mã yêu cầu để xem chi tiết.</p></div></div>
        <div className="budget-filters"><label className="wf-field"><span>Tìm yêu cầu</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Mã yêu cầu, tên kho hoặc nội dung" /></label><label className="wf-field"><span>Trạng thái</span><select value={status} onChange={e => setStatus(e.target.value)}><option value="all">Tất cả trạng thái</option>{Object.entries(budgetStatus).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>
        <div className="workspace-table"><table><thead><tr><th>Mã yêu cầu</th><th>Kho</th><th>Nội dung</th><th>Số tiền</th><th>Ngày cần cấp</th><th>Trạng thái</th></tr></thead><tbody>{filtered.map(r => <tr key={r.id}><td><button className="budget-text-button" onClick={() => { setSelectedId(r.id); setResponse(''); setError(''); }}>{r.id}</button></td><td>{r.warehouseName}</td><td className="budget-purpose">{r.purpose}</td><td>{budgetMoney(r.amount)}</td><td>{r.neededBy.split('-').reverse().join('/')}</td><td><span className={`budget-status is-${r.status}`}>{budgetStatus[r.status]}</span></td></tr>)}</tbody></table></div>
        {!filtered.length && <div className="workspace-empty">{requests.length ? 'Không có yêu cầu phù hợp với bộ lọc.' : 'Chưa có yêu cầu ngân sách.'}</div>}
        <Modal title="Chi tiết yêu cầu ngân sách" open={!!selected} onCancel={() => setSelectedId(null)} footer={null} width={600}>{selected && <div className="budget-request-detail"><span className={`budget-status is-${selected.status}`}>{budgetStatus[selected.status]}</span><h3>{selected.id}</h3><dl><dt>Kho yêu cầu</dt><dd>{selected.warehouseName}</dd><dt>Công ty</dt><dd>{selected.company}</dd><dt>Số tiền yêu cầu</dt><dd><strong>{budgetMoney(selected.amount)}</strong></dd><dt>Ngày cần cấp</dt><dd>{selected.neededBy.split('-').reverse().join('/')}</dd><dt>Ngày tạo</dt><dd>{new Date(selected.createdAt).toLocaleString('vi-VN')}</dd></dl><h4>Mục đích sử dụng</h4><p>{selected.purpose}</p>{selected.response && <><h4>Phản hồi từ công ty</h4><p>{selected.response}</p></>}
        {selected.status === 'pending' && companyView && <label className="wf-field"><span>Phản hồi / lý do từ chối</span><textarea maxLength={1000} value={response} onChange={e => setResponse(e.target.value)} placeholder="Bắt buộc khi từ chối yêu cầu" /></label>}
        {error && <p role="alert" className="budget-error">{error}</p>}
        {selected.status === 'pending' && <div className="budget-actions">{companyView ? <><button className="wf-button wf-button-secondary" onClick={() => resolve('rejected')}>Từ chối</button><button className="wf-button wf-button-primary" onClick={() => resolve('approved')}>Duyệt ngân sách</button></> : <button className="wf-button wf-button-secondary" onClick={() => resolve('cancelled')}>Hủy yêu cầu</button>}</div>}
        </div>}</Modal>
    </section>;
}
