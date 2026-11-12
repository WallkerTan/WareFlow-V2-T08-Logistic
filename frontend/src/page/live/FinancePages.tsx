import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApi } from '../../hook/useApi';
import { useCollection } from '../../hook/useCollection';
import { money, mutate, number, query, rows, text } from '../../services/api';
import type { Row } from '../../services/api';
import { useWorkspace } from '../../components/live/workspaceContext';
import Resource from '../../components/live/Resource';
import Editor from '../../components/live/Editor';
import type { Field, Values } from '../../components/live/Editor';
import { Add, Empty, Heading, Loading, Notice, Refresh, Summary, Table, WarehousePicker } from '../../components/live/UI';
import { commonColumns as c, labels, status } from '../../components/live/presentation';

type Tab = 'reports' | 'budgets' | 'transactions' | 'expenses' | 'audit';
const tabNames: Record<Tab, string> = { reports: 'Báo cáo', budgets: 'Ngân sách', transactions: 'Thu / chi', expenses: 'Đề nghị chi', audit: 'Nhật ký tài chính' };
const categories = ['SALE', 'PURCHASE', 'TRANSFER', 'OTHER'].map(value => ({ value, label: labels[value] }));
export default function FinancePage({ initialTab = 'reports' }: { initialTab?: Tab }) {
    const { session, warehouses, warehouseId } = useWorkspace(); const admin = session.role === 'SYSTEM_ADMIN'; const manager = session.role === 'WAREHOUSE_MANAGER';
    const companies = useCollection('core', admin ? '/companies' : null);
    const [selectedCompany, setSelectedCompany] = useState(''); const companyId = admin ? selectedCompany || String(companies.data.find(r => r.status === 'ACTIVE')?.id || companies.data[0]?.id || '') : session.companyId || '';
    const [period, setPeriod] = useState(() => `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
    const [draftPeriod, setDraftPeriod] = useState(period); const [scoped, setScoped] = useState(manager); const [tab, setTab] = useState<Tab>(initialTab);
    const selectedWarehouse = scoped && warehouses.find(w => String(w.id) === warehouseId && w.ownerCompanyId === companyId) ? warehouseId : '';
    const scope = query({ companyId: admin ? companyId : undefined, warehouseId: selectedWarehouse || undefined, period });
    const ready = !!companyId && (!manager || !!selectedWarehouse);
    const [revision, setRevision] = useState(0); const [editing, setEditing] = useState<{ kind: Tab; row?: Row } | null>(() => location.pathname.includes('/budget/new') ? { kind: 'budgets' } : null);
    const [decision, setDecision] = useState<{ row: Row; action: string } | null>(null);
    const scopeWarehouses = warehouses.filter(w => w.ownerCompanyId === companyId).map(w => ({ value: String(w.id), label: text(w.name) }));
    const budgetFields: Field[] = [{ name: 'warehouseId', label: 'Kho nhận ngân sách (để trống cho toàn công ty)', type: 'select', options: scopeWarehouses }, { name: 'period', label: 'Kỳ ngân sách', required: true, hint: 'YYYY-MM, YYYY hoặc Q1-YYYY' }, { name: 'allocated', label: 'Ngân sách cấp (VNĐ)', type: 'number', required: true, min: 0.01 }];
    const transactionFields: Field[] = [{ name: 'warehouseId', label: 'Kho', type: 'select', required: manager, options: scopeWarehouses }, { name: 'type', label: 'Loại giao dịch', type: 'select', required: true, options: (manager ? ['INCOME'] : ['INCOME', 'EXPENSE']).map(value => ({ value, label: labels[value] })) }, { name: 'category', label: 'Nhóm giao dịch', required: true, type: 'select', options: categories }, { name: 'amount', label: 'Số tiền (VNĐ)', required: true, type: 'number', min: 0.01 }, { name: 'note', label: 'Ghi chú', type: 'textarea' }];
    const expenseFields: Field[] = [{ name: 'warehouseId', label: 'Kho đề nghị chi', required: true, type: 'select', options: scopeWarehouses }, { name: 'category', label: 'Nhóm chi', type: 'select', required: true, options: categories.filter(o => o.value !== 'SALE') }, { name: 'amount', label: 'Số tiền (VNĐ)', type: 'number', required: true, min: 0.01 }, { name: 'note', label: 'Nội dung đề nghị', type: 'textarea', required: true }];
    return <><Heading title="Ngân sách & thu chi" /><div className="live-toolbar">
        {admin && <label>Công ty<select value={companyId} onChange={e => setSelectedCompany(e.target.value)}><option value="">Chọn công ty</option>{companies.data.map(r => <option key={String(r.id)} value={String(r.id)}>{text(r.name)}</option>)}</select></label>}
        <form className="live-toolbar" onSubmit={e => { e.preventDefault(); setPeriod(draftPeriod.trim()); }}><label>Kỳ báo cáo<input value={draftPeriod} onChange={e => setDraftPeriod(e.target.value)} required placeholder="2026-11 / 2026 / Q1-2026" /></label><button className="adm-btn" type="submit">Xem kỳ</button></form>
        {!manager && <label className="live-checkbox"><input type="checkbox" checked={scoped} onChange={e => setScoped(e.target.checked)} />Chỉ kho đang chọn</label>}
    </div>{(scoped || manager) && <WarehousePicker required />}{companies.error && <Notice error>{companies.error}</Notice>}
        <nav className="live-tabs" aria-label="Tài chính">{(Object.keys(tabNames) as Tab[]).filter(t => !manager || t !== 'audit').map(t => <button key={t} className={tab === t ? 'is-active' : ''} onClick={() => setTab(t)}>{tabNames[t]}</button>)}</nav>
        {!ready ? <Empty>{manager ? 'Chọn kho được bàn giao để xem thu chi.' : 'Chọn công ty để xem dữ liệu tài chính.'}</Empty> : <>
            {tab === 'reports' && <FinanceReport key={`${scope}-${revision}`} scope={scope} />}
            {tab === 'budgets' && <Resource key={`${scope}-${revision}`} title="Ngân sách đã cấp" service="finance" path={`/budgets${scope}`} columns={[{ key: 'warehouseId', label: 'Phạm vi', render: r => r.warehouseId ? text(warehouses.find(w => w.id === r.warehouseId)?.name || r.warehouseId) : 'Toàn công ty' }, { key: 'period', label: 'Kỳ' }, { key: 'allocated', label: 'Đã cấp', render: r => money(r.allocated) }, { key: 'spent', label: 'Đã chi', render: r => money(r.spent) }, { key: 'remaining', label: 'Còn lại', render: r => money(r.remaining) }, { key: 'overBudget', label: 'Vượt ngân sách', render: r => money(r.overBudget) }]}
                toolbar={!manager && <Add label="Cấp ngân sách" onClick={() => setEditing({ kind: 'budgets' })} />} actions={!manager ? row => <button className="adm-btn" onClick={() => setEditing({ kind: 'budgets', row })}>Điều chỉnh ngân sách</button> : undefined} />}
            {tab === 'transactions' && <Resource key={`${scope}-${revision}`} title="Sổ thu chi" service="finance" path={`/transactions${scope}`} columns={[{ key: 'type', label: 'Loại', render: r => status(r.type) }, { key: 'category', label: 'Nhóm', render: r => status(r.category) }, c.amount, { key: 'warehouseId', label: 'Kho', render: r => text(warehouses.find(w => w.id === r.warehouseId)?.name || r.warehouseId) }, { key: 'note', label: 'Ghi chú' }, c.created]} toolbar={<Add label="Ghi nhận thu / chi" onClick={() => setEditing({ kind: 'transactions' })} />} />}
            {tab === 'expenses' && <Resource key={`${scope}-${revision}`} title="Đề nghị chi" service="finance" path={`/expense-requests${scope}`} columns={[{ key: 'note', label: 'Nội dung' }, { key: 'warehouseId', label: 'Kho', render: r => text(warehouses.find(w => w.id === r.warehouseId)?.name || r.warehouseId) }, c.amount, c.status, { key: 'decisionNote', label: 'Ý kiến duyệt' }, c.created]}
                toolbar={!admin && <Add label="Tạo đề nghị chi" onClick={() => setEditing({ kind: 'expenses' })} />} actions={!manager ? row => row.status === 'PENDING' && <>{['approve', 'reject'].map(action => <button key={action} className="adm-btn" onClick={() => setDecision({ row, action })}>{action === 'approve' ? 'Duyệt chi' : 'Từ chối'}</button>)}</> : undefined} />}
            {tab === 'audit' && !manager && <Resource key={`${scope}-${revision}`} title="Nhật ký tài chính" service="finance" path={`/audit-logs${query({ companyId: admin ? companyId : undefined })}`} columns={[{ key: 'actorId', label: 'Người thực hiện' }, { key: 'action', label: 'Thao tác' }, { key: 'targetId', label: 'Bản ghi liên quan' }, c.created]} />}
        </>}
        {editing && <Editor title={editing.kind === 'budgets' ? 'Cấp / điều chỉnh ngân sách' : editing.kind === 'expenses' ? 'Đề nghị chi' : 'Ghi nhận thu / chi'} fields={editing.kind === 'budgets' ? budgetFields : editing.kind === 'expenses' ? expenseFields : transactionFields}
            initial={{ period, warehouseId: selectedWarehouse, ...editing.row }} onClose={() => setEditing(null)} onSave={async (v: Values) => {
                const kind = editing.kind; const body = kind === 'budgets' ? { warehouseId: v.warehouseId || null, period: v.period, allocated: number(v.allocated) } : { warehouseId: v.warehouseId || null, category: v.category, amount: number(v.amount), note: v.note, ...(kind === 'transactions' ? { type: v.type } : {}) };
                const target = kind === 'budgets' ? `/budgets${editing.row ? `/${editing.row.id}` : ''}` : kind === 'expenses' ? '/expense-requests' : '/transactions';
                await mutate('finance', `${target}${query({ companyId: admin ? companyId : undefined })}`, editing.row ? 'PUT' : 'POST', body); setRevision(v => v + 1);
            }} />}
        {decision && <Editor title={decision.action === 'approve' ? 'Duyệt đề nghị chi' : 'Từ chối đề nghị chi'} fields={[{ name: 'note', label: 'Ý kiến duyệt', type: 'textarea', required: decision.action === 'reject' }]} onClose={() => setDecision(null)} onSave={async v => { await mutate('finance', `/expense-requests/${decision.row.id}/${decision.action}`, 'POST', v); setRevision(v => v + 1); }} />}</>;
}
function FinanceReport({ scope }: { scope: string }) {
    const summary = useApi<Row>('finance', `/reports/finance${scope}`);
    const timeseries = useApi<Row>('finance', `/reports/finance/timeseries${scope}`);
    const categories = useApi<Row>('finance', `/reports/finance/categories${scope}`);
    return <><div className="live-actions"><Refresh onClick={() => { summary.reload(); timeseries.reload(); categories.reload(); }} /></div>{summary.loading && <Loading />}{summary.error && <Notice error>{summary.error}</Notice>}
        {summary.data && <Summary values={[['income', 'Tổng thu'], ['expense', 'Tổng chi'], ['systemFee', 'Phí WareFlow'], ['net', 'Chênh lệch thu chi']].map(([key, label]) => ({ label, value: money(summary.data?.[key]) }))} />}
        <section className="wf-card"><h2>Thu chi theo thời gian</h2>{timeseries.loading && <Loading />}{timeseries.error && <Notice error>{timeseries.error}</Notice>}{timeseries.data && (rows(timeseries.data.points).length ? <div className="live-chart"><ResponsiveContainer width="100%" height={300}><AreaChart data={rows(timeseries.data.points)}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis tickFormatter={v => number(v).toLocaleString('vi-VN')} /><Tooltip formatter={v => money(v)} /><Legend /><Area type="monotone" dataKey="income" name="Thu" stroke="#2563eb" fill="#dbeafe" /><Area type="monotone" dataKey="expense" name="Chi" stroke="#ea580c" fill="#ffedd5" /><Area type="monotone" dataKey="systemFee" name="Phí" stroke="#9333ea" fill="#f3e8ff" /></AreaChart></ResponsiveContainer></div> : <Empty />)}</section>
        <section className="wf-card"><h2>Phân loại thu chi</h2>{categories.error && <Notice error>{categories.error}</Notice>}{categories.loading && <Loading />}{categories.data && <Table rows={rows(categories.data.items)} columns={[{ key: 'category', label: 'Nhóm', render: r => status(r.category) }, ...['income', 'expense', 'systemFee', 'net'].map((key, i) => ({ key, label: ['Thu', 'Chi', 'Phí', 'Chênh lệch'][i], render: (r: Row) => money(r[key]) }))]} />}</section></>;
}
