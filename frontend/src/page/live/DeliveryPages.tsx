import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { mutate, money, number, object, text, date, query } from '../../services/api';
import type { Row } from '../../services/api';
import { useCollection } from '../../hook/useCollection';
import { useWorkspace } from '../../components/live/workspaceContext';
import Resource from '../../components/live/Resource';
import Editor from '../../components/live/Editor';
import { Add, Notice, Table, WarehousePicker } from '../../components/live/UI';
import { commonColumns as c, labels, status } from '../../components/live/presentation';
import { useAction } from '../../hook/useAction';
import { Modal } from '../../components/admin/AdminUI';
const nextStatuses: Record<string, string[]> = { CREATED: ['IN_TRANSIT'], IN_TRANSIT: ['DELIVERED', 'FAILED'], FAILED: ['IN_TRANSIT', 'RETURNED'] };
export default function ShipmentsPage() {
    const { warehouseId, session } = useWorkspace(); const [params, setParams] = useSearchParams();
    const [revision, setRevision] = useState(0); const [creating, setCreating] = useState(!!params.get('documentId') || location.pathname.endsWith('/new'));
    const [editing, setEditing] = useState<Row | null>(null); const [changing, setChanging] = useState<Row | null>(null); const [history, setHistory] = useState<Row | null>(null);
    const [filter, setFilter] = useState(''); const [cod, setCod] = useState(''); const [search, setSearch] = useState('');
    const sales = useCollection('inventory', warehouseId && session.role !== 'SYSTEM_ADMIN' ? `/warehouses/${warehouseId}/exports?status=DONE&type=EXPORT_SALE` : null);
    const mutation = useAction(() => setRevision(v => v + 1)); const writable = session.role !== 'SYSTEM_ADMIN';
    const base = `/warehouses/${warehouseId}/shipments`;
    return <><WarehousePicker required />{mutation.notice}{sales.error && <Notice error>{sales.error}</Notice>}{warehouseId && <Resource key={`${warehouseId}-${revision}`} title="Giao hàng & vận đơn" service="delivery" path={`${base}${query({ status: filter, codStatus: cod, q: search })}`}
        toolbar={<div className="live-toolbar"><label>Mã vận đơn / đơn vị giao<input value={search} onChange={e => setSearch(e.target.value)} /></label><label>Trạng thái<select value={filter} onChange={e => setFilter(e.target.value)}><option value="">Tất cả</option>{['CREATED', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETURNED'].map(v => <option key={v} value={v}>{labels[v]}</option>)}</select></label><label>COD<select value={cod} onChange={e => setCod(e.target.value)}><option value="">Tất cả</option>{['NOT_REQUIRED', 'PENDING', 'COLLECTED'].map(v => <option key={v} value={v}>{labels[v]}</option>)}</select></label>{writable && <Add label="Tạo vận đơn" onClick={() => setCreating(true)} />}</div>}
        columns={[{ key: 'trackingCode', label: 'Mã vận đơn' }, { key: 'carrier', label: 'Đơn vị giao' }, c.status, { key: 'codAmount', label: 'Tiền COD', render: r => money(r.codAmount) }, { key: 'codStatus', label: 'Thu hộ', render: r => status(r.codStatus) }, c.created]}
        actions={r => <><button className="adm-btn" onClick={() => setHistory(r)}>Lịch sử giao hàng</button>{writable && <>
            {r.status === 'CREATED' && <button className="adm-btn" onClick={() => setEditing(r)}>Sửa vận đơn</button>}
            {!!nextStatuses[String(r.status)]?.length && <button className="adm-btn" onClick={() => setChanging(r)}>Cập nhật giao hàng</button>}
            {r.status === 'DELIVERED' && r.codStatus === 'PENDING' && <button className="adm-btn" disabled={mutation.pending} onClick={() => { if (window.confirm(`Xác nhận đã thu ${money(r.codAmount)}?`)) void mutation.run(() => mutate('delivery', `${base}/${r.id}/cod/collect`, 'POST'), 'Đã xác nhận thu COD.'); }}>Xác nhận thu COD</button>}
        </>}</>} />}
        {(creating || editing) && warehouseId && <Editor title={editing ? 'Sửa vận đơn' : 'Tạo vận đơn'} initial={editing || { documentId: params.get('documentId') || '', codAmount: '0' }}
            fields={[...(!editing ? [{ name: 'documentId', label: 'Đơn xuất bán đã hoàn tất', type: 'select' as const, required: true, options: sales.data.map(r => ({ value: String(r.id), label: `${String(r.id).slice(0, 8)} · ${date(r.createdAt)} · ${Array.isArray(r.lines) ? r.lines.length : 0} dòng hàng` })) }] : []), { name: 'carrier', label: 'Đơn vị vận chuyển', required: true }, { name: 'trackingCode', label: 'Mã vận đơn', required: true }, { name: 'codAmount', label: 'Số tiền COD (VNĐ)', type: 'number', min: 0, required: true }]}
            onClose={() => { setEditing(null); setCreating(false); setParams({}); }} onSave={async v => { await mutate('delivery', editing ? `${base}/${editing.id}` : base, editing ? 'PATCH' : 'POST', { ...(editing ? {} : { documentId: v.documentId }), carrier: v.carrier, trackingCode: v.trackingCode, codAmount: number(v.codAmount) }); setRevision(v => v + 1); }} />}
        {changing && <Editor title="Cập nhật hành trình giao hàng" fields={[{ name: 'status', label: 'Trạng thái tiếp theo', required: true, type: 'select', options: (nextStatuses[String(changing.status)] || []).map(value => ({ value, label: labels[value] })) }, { name: 'location', label: 'Vị trí hiện tại' }, { name: 'note', label: 'Ghi chú', type: 'textarea' }]} onClose={() => setChanging(null)} onSave={async v => { await mutate('delivery', `${base}/${changing.id}/status`, 'PATCH', v); setRevision(v => v + 1); }} />}
        {history && <Modal title={`Lịch sử ${text(history.trackingCode)}`} onClose={() => setHistory(null)}><Table rows={Array.isArray(history.history) ? history.history.map(object) : []} columns={[{ key: 'action', label: 'Thao tác' }, { key: 'status', label: 'Trạng thái', render: r => status(r.status) }, { key: 'note', label: 'Ghi chú' }, { key: 'location', label: 'Vị trí' }, { key: 'time', label: 'Thời điểm', render: r => date(r.time) }]} /></Modal>}
        {creating && !sales.loading && !sales.data.length && <Notice>Chưa có đơn xuất bán hoàn tất. Hoàn tất bước lấy hàng, đóng gói và xuất bán trước khi tạo vận đơn.</Notice>}</>;
}
