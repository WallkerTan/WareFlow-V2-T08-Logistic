import { DataPage } from '../../components/workspace/WorkspacePages';
import { useState } from 'react';
import BudgetRequestList from '../../components/workspace/BudgetRequestList';
import { useBudgetRequests } from '../../data/budgetRequests';
import { useDepots } from '../../data/warehouses';

export default function CompanyApprovalsPage() {
    const requests = useBudgetRequests();
    const warehouses = useDepots();
    const companies = [...new Set(warehouses.map(w => w.company).filter(Boolean))].sort();
    const [selectedCompany, setSelectedCompany] = useState('');
    const company = companies.includes(selectedCompany) ? selectedCompany : companies[0] || '';
    return <>
        <DataPage title="Trung tâm phê duyệt" columns={['Mã yêu cầu', 'Loại yêu cầu', 'Người gửi', 'Kho', 'Ngày tạo', 'Trạng thái']} rows={[["YC-001", "Cấp ngân sách", "Nguyễn Minh Anh", "Bình Dương", "04/11/2026", "Chờ duyệt"], ["YC-002", "Điều chuyển hàng", "Trần Quốc Bảo", "Thủ Đức", "03/11/2026", "Chờ duyệt"]]} />
        <div className="budget-company-requests"><section className="wf-card" style={{ marginBottom: 16 }}><label className="wf-field"><span>Công ty duyệt ngân sách (bản demo)</span><select value={company} disabled={!companies.length} onChange={e => setSelectedCompany(e.target.value)}>{!companies.length && <option value="">Chưa có công ty</option>}{companies.map(c => <option key={c} value={c}>{c}</option>)}</select><small>Yêu cầu từ Storehouse được đồng bộ trên cùng trình duyệt. Phê duyệt tại đây chưa thực hiện giải ngân.</small></label></section><BudgetRequestList requests={requests.filter(r => r.company === company)} companyView /></div>
    </>;
}
