import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hook/useApi';
import { mutate, money, object, rows, text, date } from '../../services/api';
import type { Row, Service } from '../../services/api';
import { useWorkspace } from '../../components/live/workspaceContext';
import { Heading, Loading, Notice, Pager, Refresh, Table } from '../../components/live/UI';
import { commonColumns as c, status } from '../../components/live/presentation';
import Editor from '../../components/live/Editor';
import { Modal } from '../../components/admin/AdminUI';
import { Details } from '../../components/live/Details';
import { DocumentLines } from './InventoryPages';
export default function ApprovalsPage() {
    const { warehouses } = useWorkspace(); const [page, setPage] = useState(0);
    const resource = useApi<Row>('core', `/approvals?page=${page}&size=20`);
    const [decision, setDecision] = useState<{ service: Service; path: string; action: string } | null>(null); const [detail, setDetail] = useState<Row | null>(null);
    const [expense,setExpense]=useState<Row|null>(null);
    const inventory = rows(resource.data?.inventory);
    const groups = [object(resource.data?.warehouseTransactions), object(resource.data?.negotiatingWarehouseTransactions), object(resource.data?.expenses), ...inventory.map(r => object(r.documents))];
    const totalPages = Math.max(1, ...groups.map(g => Number(g.totalPages) || 0));
    function controls(service: Service, path: string) { return <>{['approve', 'reject'].map(action => <button className="adm-btn" key={action} onClick={() => setDecision({ service, path, action })}>{action === 'approve' ? 'Duyệt' : 'Từ chối'}</button>)}</>; }
    return <><Heading title="Trung tâm phê duyệt"><Refresh onClick={resource.reload} /></Heading>{resource.loading && <Loading />}{resource.error && <Notice error>{resource.error}</Notice>}
        {resource.data && <><section className="wf-card"><div className="live-toolbar"><h2>Đề nghị mua / thuê kho</h2><Link className="adm-btn" to="/company/warehouse-transactions">Theo dõi / thương lượng / bàn giao</Link></div><p>Các đề nghị kho được quản trị hệ thống duyệt.</p><Table rows={[...rows(object(resource.data.warehouseTransactions).content), ...rows(object(resource.data.negotiatingWarehouseTransactions).content)]} columns={[{ key: 'warehouseName', label: 'Kho' }, { key: 'type', label: 'Hình thức', render: r => status(r.type) }, { key: 'offeredPrice', label: 'Giá đề nghị', render: r => money(r.offeredPrice) }, c.status]} /></section>
            <section className="wf-card"><h2>Đề nghị chi</h2><Table rows={rows(object(resource.data.expenses).content)} columns={[{ key: 'note', label: 'Nội dung' }, c.amount, c.status, c.created]} actions={r => <><button className="adm-btn" onClick={()=>setExpense(r)}>Xem đề nghị</button>{controls('finance', `/expense-requests/${r.id}`)}</>} /></section>
            {inventory.map(group => <section className="wf-card" key={String(group.warehouseId)}><h2>Phiếu chờ duyệt · {text(warehouses.find(w => w.id === group.warehouseId)?.name || group.warehouseId)}</h2><Table rows={rows(object(group.documents).content)} columns={[{ key: 'id', label: 'Mã phiếu' }, { key: 'type', label: 'Loại', render: r => status(r.type) }, c.status, c.created]} actions={r => {
                const collection = r.type === 'PO' ? 'purchase-orders' : r.type === 'STOCKTAKE' ? 'stocktakes' : r.type === 'ADJUST' ? 'adjustments' : 'exports';
                return <><button className="adm-btn" onClick={() => setDetail(r)}>Xem dòng hàng</button>{controls('inventory', `/warehouses/${group.warehouseId}/${collection}/${r.id}`)}</>;
            }} /></section>)}
            <Pager page={page} totalPages={totalPages} totalElements={groups.reduce((total, g) => total + (Number(g.totalElements) || 0), 0)} onChange={setPage} /></>}
        {expense&&<Modal title="Chi tiết đề nghị chi" onClose={()=>setExpense(null)}><Details items={[{label:'Kho',value:text(warehouses.find(w=>w.id===expense.warehouseId)?.name||expense.warehouseId)},{label:'Nội dung',value:text(expense.note)},{label:'Số tiền',value:money(expense.amount)},{label:'Nhóm chi',value:status(expense.category)},{label:'Ngày lập',value:date(expense.createdAt)},{label:'Trạng thái',value:status(expense.status)}]}/></Modal>}
        {decision && <Editor title={decision.action === 'approve' ? 'Phê duyệt yêu cầu' : 'Từ chối yêu cầu'} fields={[{ name: 'note', label: 'Ý kiến / lý do', type: 'textarea', required: decision.action === 'reject' }]} onClose={() => setDecision(null)} onSave={async v => { await mutate(decision.service, `${decision.path}/${decision.action}`, 'POST', v); resource.reload(); }} />}
        {detail && <Modal title="Chi tiết phiếu chờ duyệt" onClose={() => setDetail(null)}><DocumentLines document={detail} /></Modal>}</>;
}
