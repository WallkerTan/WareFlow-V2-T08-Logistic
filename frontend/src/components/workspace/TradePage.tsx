import { useState } from 'react';
import { getAuthSession } from '../../services/authApi';
import { request, rows, number, money, object } from '../../services/api';
import type { Row } from '../../services/api';
import { useAdminData, saveResource, mapLimit } from '../../services/data';
import { useQuery, invalidateData } from '../../services/query';
import { useWorkspace } from '../../services/workspace';
import { Heading } from './WorkspacePages';

type Mode = 'batches' | 'inbound' | 'outbound' | 'shipments' | 'transfers' | 'approvals';
type Line = { key: string; supplierId: string; productId: string; lotId: string; quantity: string; minStock: string; percentage: string };
const newLine = (): Line => ({ key: crypto.randomUUID(), supplierId: '', productId: '', lotId: '', quantity: '1', minStock: '0', percentage: '100' });
const labels: Record<string,string> = { READY: 'Sẵn sàng', RESERVED: 'Đã chọn nhập', IMPORTED: 'Đã nhập kho', RETURNING: 'Đang hoàn trả', RETURNED: 'Đã hoàn trả', PENDING_APPROVAL: 'Chờ công ty duyệt', PAYMENT_PENDING: 'Chờ thanh toán', SHIPPING: 'Đang giao', DONE: 'Hoàn tất', CANCELLED: 'Đã từ chối', IMPORT: 'Nhập hàng', SALE: 'Xuất bán', RETURN: 'Hoàn nhà cung cấp', TRANSFER: 'Điều chuyển' };
const title: Record<Mode,string> = { batches: 'Lô hàng', inbound: 'Nhập hàng hóa', outbound: 'Xuất hàng hóa', shipments: 'Giao hàng & vận đơn', transfers: 'Điều chuyển & hoàn hàng', approvals: 'Duyệt yêu cầu nhập hàng' };

export default function TradePage({ mode }: { mode: Mode }) {
    const scope = useWorkspace(); const session = getAuthSession()!; const manager = session.role === 'WAREHOUSE_MANAGER';
    const { raw } = useAdminData('suppliers', 'supplierProducts', 'products', 'lots');
    const warehouseId = scope.warehouseId;
    const base = `/warehouses/${warehouseId}/trade`;
    const batchQuery = useQuery<Row[]>(warehouseId ? `trade-batches:${warehouseId}` : null, () => request('inventory', `${base}/batches`));
    const operations = useQuery<Row[]>(warehouseId ? `trade-operations:${mode}:${scope.warehouses.map(w => w.id).join(',')}:${warehouseId}` : null,
        async () => mode === 'approvals' ? (await mapLimit(scope.warehouses, w => request<Row[]>('inventory', `/warehouses/${w.id}/trade/operations`))).flat() : request('inventory', `${base}/operations`));
    const wallet = useQuery<Row>(warehouseId ? `wallet:${manager ? warehouseId : session.companyId}` : null, () => request('finance', `/wallet${manager ? `?warehouseId=${warehouseId}` : ''}`));
    const [lines, setLines] = useState<Line[]>([newLine()]); const [selected, setSelected] = useState<string[]>([]);
    const [kind, setKind] = useState(mode === 'transfers' ? 'TRANSFER' : 'SALE');
    const [target, setTarget] = useState(''); const [recipient, setRecipient] = useState({ name: '', address: '', phone: '' });
    const [note, setNote] = useState(''); const [pending, setPending] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
    const [requestId, setRequestId] = useState(() => crypto.randomUUID());
    const batches = batchQuery.data || []; const stock = raw.products.filter(p => p.warehouseId === warehouseId);
    const lots = raw.lots.filter(l => l.warehouseId === warehouseId && number(l.quantity) > number(l.reserved));
    const patch = (index: number, key: keyof Line, value: string) => setLines(current => current.map((line, i) => i === index ? { ...line, [key]: value, ...(key === 'supplierId' ? { productId: '' } : {}), ...(key === 'productId' ? { lotId: '' } : {}) } : line));
    async function run(action: () => Promise<unknown>, message: string) {
        if (pending) return; setPending(true); setError(''); setSuccess('');
        try { await action(); setSuccess(message); setSelected([]); setLines([newLine()]); setRequestId(crypto.randomUUID()); }
        catch (e) { setError(e instanceof Error ? e.message : 'Không thực hiện được yêu cầu'); }
        finally { setPending(false); invalidateData(); }
    }
    const batchTotal = (batch: Row) => rows(batch.lines).reduce((s, line) => s + number(line.total), 0);
    const lineTotal = lines.reduce((sum, line) => {
        const price = mode === 'batches' ? number(raw.supplierProducts.find(p => p.id === line.productId && p.supplierId === line.supplierId)?.price) : number(lots.find(l => l.id === line.lotId)?.unitPrice);
        return sum + price * number(line.quantity) * (kind === 'SALE' && mode !== 'batches' ? number(line.percentage) / 100 : 1);
    }, 0);
    const importTotal = batches.filter(b => selected.includes(String(b.id))).reduce((s, b) => s + batchTotal(b), 0);
    const visible = (operations.data || []).filter(op => mode === 'approvals' ? op.kind === 'IMPORT' && ['PENDING_APPROVAL', 'PAYMENT_PENDING'].includes(String(op.status)) : mode === 'inbound' ? op.kind === 'IMPORT' : mode === 'transfers' ? ['TRANSFER', 'RETURN'].includes(String(op.kind)) : op.kind === 'SALE');
    function submit(event: React.FormEvent) {
        event.preventDefault();
        if (mode === 'batches') return void run(() => saveResource('inventory', `${base}/batches`, 'POST', { lines: lines.map(l => ({ supplierId: l.supplierId, productId: l.productId, quantity: number(l.quantity), minStock: number(l.minStock) })) }), 'Đã tạo lô hàng và mã lô tự động.');
        if (mode === 'inbound') return void run(() => saveResource('inventory', `${base}/imports`, 'POST', { id: requestId, batchIds: selected }), manager ? 'Đã gửi yêu cầu công ty phê duyệt.' : 'Thanh toán thành công; hàng đã được thêm vào kho.');
        void run(() => saveResource('inventory', `${base}/outbound`, 'POST', { id: requestId, kind, targetWarehouseId: kind === 'TRANSFER' ? target : null,
            recipientName: recipient.name, recipientAddress: recipient.address, recipientPhone: recipient.phone, note,
            lines: lines.map(l => ({ lotId: l.lotId, quantity: number(l.quantity), percentage: number(l.percentage) })) }), kind === 'SALE' ? 'Đã tạo đơn xuất hàng và giữ chỗ tồn kho. Theo dõi tại Giao hàng & vận đơn.' : 'Đã hoàn tất nghiệp vụ.');
    }
    return <><Heading title={title[mode]} />
        <label className="wf-field"><span>Kho {manager ? 'đang quản lý' : 'thực hiện'}</span><select disabled={manager || pending} value={warehouseId} onChange={e => { scope.selectWarehouse(e.target.value); setLines([newLine()]); setSelected([]); setRequestId(crypto.randomUUID()); }}>
            {!scope.warehouses.length && <option value="">Chưa có kho</option>}{scope.warehouses.map(w => <option key={String(w.id)} value={String(w.id)}>{String(w.name)}</option>)}</select></label>
        {wallet.data && <p>Số dư tài khoản {manager ? 'kho' : 'công ty'}: <strong>{money(wallet.data.balance)}</strong></p>}
        {[batchQuery.error, operations.error, wallet.error, error].filter(Boolean).map((message,i) => <p key={i} className="wf-notice" role="alert">{message}</p>)}
        {success && <p className="wf-notice" role="status">{success}</p>}
        {['batches', 'inbound', 'outbound', 'transfers'].includes(mode) && <form className="wf-card" onSubmit={submit}><fieldset disabled={pending || !warehouseId} style={{ border: 0, padding: 0 }}>
            {mode === 'inbound' ? <><h3>Chọn một hoặc nhiều lô hàng</h3>{batches.filter(b => b.status === 'READY').map(b => <label className="wf-field" key={String(b.id)}><span><input type="checkbox" checked={selected.includes(String(b.id))} onChange={e => setSelected(s => e.target.checked ? [...s, String(b.id)] : s.filter(id => id !== b.id))} /> {String(b.code)} · {money(batchTotal(b))} · {rows(b.lines).length} dòng hàng</span></label>)}
                {!batches.some(b => b.status === 'READY') && <p>Chưa có lô sẵn sàng. Tạo lô mới trong tab Lô hàng.</p>}
                <p>Tiền hàng: {money(importTotal)} · Phí 5%: {money(importTotal * .05)} · Tổng trừ: <strong>{money(importTotal * 1.05)}</strong></p>
                <p>{manager ? 'Công ty duyệt và thanh toán bằng tài khoản kho. Nếu không đủ số dư, cần cấp ngân sách trước.' : 'Thanh toán bằng tài khoản công ty. Hàng được thêm vào kho sau khi thanh toán thành công.'}</p>
            </> : <>
                {mode === 'transfers' && <div className="wf-fields"><label className="wf-field"><span>Nghiệp vụ</span><select value={kind} onChange={e => { setKind(e.target.value); setLines([newLine()]); }}><option value="TRANSFER">Điều chuyển giữa hai kho</option><option value="RETURN">Hoàn nguyên lô cho nhà cung cấp</option></select></label>{kind === 'TRANSFER' && <label className="wf-field"><span>Kho nhận</span><select required value={target} onChange={e => setTarget(e.target.value)}><option value="">Chọn kho</option>{scope.warehouses.filter(w => w.id !== warehouseId).map(w => <option key={String(w.id)} value={String(w.id)}>{String(w.name)}</option>)}</select></label>}</div>}
                {mode === 'outbound' && <div className="wf-fields">{(['name','address','phone'] as const).map((key,i) => <label key={key} className="wf-field"><span>{['Tên người nhận','Địa chỉ','Số điện thoại'][i]}</span><input required maxLength={255} type={key === 'phone' ? 'tel' : 'text'} value={recipient[key]} onChange={e => setRecipient(r => ({ ...r, [key]: e.target.value }))}/></label>)}</div>}
                {kind === 'RETURN' && <label className="wf-field"><span>Chọn toàn bộ lô hoàn (từ 10.000.000 ₫)</span><select required defaultValue="" onChange={e => setLines(lots.filter(l => l.tradeBatchId === e.target.value).map(l => ({ ...newLine(), productId: String(l.productId), lotId: String(l.id), quantity: String(l.quantity) })))}><option value="">Chọn lô</option>{batches.filter(b => b.status === 'IMPORTED' && lots.some(l => l.tradeBatchId === b.id)).map(b => <option key={String(b.id)} value={String(b.id)}>{String(b.code)}</option>)}</select></label>}
                {lines.map((line,index) => {
                    const catalog = raw.supplierProducts.filter(p => p.supplierId === line.supplierId);
                    const product = (mode === 'batches' ? catalog : stock).find(p => p.id === line.productId);
                    const lot = lots.find(l => l.id === line.lotId);
                    const price = mode === 'batches' ? number(product?.price) : number(lot?.unitPrice);
                    const inventory = stock.filter(p => p.sku === product?.sku).reduce((s,p) => s + number(p.quantity),0);
                    return <section className="wf-card" key={line.key}><h3>Dòng hàng {index + 1}</h3><div className="wf-fields">
                        {mode === 'batches' && <label className="wf-field"><span>Nhà cung cấp</span><select required value={line.supplierId} onChange={e => patch(index,'supplierId',e.target.value)}><option value="">Chọn nhà cung cấp</option>{raw.suppliers.map(s => <option key={String(s.id)} value={String(s.id)}>{String(s.name)}</option>)}</select></label>}
                        <label className="wf-field"><span>Sản phẩm / SKU</span><select required value={line.productId} disabled={kind === 'RETURN'} onChange={e => patch(index,'productId',e.target.value)}><option value="">Chọn sản phẩm</option>{(mode === 'batches' ? catalog : stock).map(p => <option key={String(p.id)} value={String(p.id)}>{String(p.sku)} · {String(p.name)}</option>)}</select></label>
                        {mode !== 'batches' && <label className="wf-field"><span>Lô sản phẩm</span><select required disabled={kind === 'RETURN'} value={line.lotId} onChange={e => patch(index,'lotId',e.target.value)}><option value="">Chọn lô</option>{lots.filter(l => l.productId === line.productId).map(l => <option key={String(l.id)} value={String(l.id)}>{String(l.lotCode)} · Khả dụng {number(l.quantity)-number(l.reserved)}</option>)}</select></label>}
                        <label className="wf-field"><span>Số lượng</span><input required type="number" min="0.01" step="0.01" readOnly={kind === 'RETURN'} value={line.quantity} onChange={e => patch(index,'quantity',e.target.value)}/></label>
                        {mode === 'batches' ? <label className="wf-field"><span>Ngưỡng cảnh báo tồn thấp</span><input required type="number" min="0" step="0.01" value={line.minStock} onChange={e => patch(index,'minStock',e.target.value)}/></label> : kind === 'SALE' && <label className="wf-field"><span>Giá bán (% giá gốc)</span><input required type="number" min="0" max="500" step="0.01" value={line.percentage} onChange={e => patch(index,'percentage',e.target.value)}/></label>}
                    </div><p>Giá niêm yết: {money(price)} · Thành tiền: <strong>{money(price * number(line.quantity) * (mode !== 'batches' && kind === 'SALE' ? number(line.percentage)/100 : 1))}</strong></p>
                    {product && inventory < (mode === 'batches' ? number(line.minStock) : number(product.minStock)) && <p role="status">⚠ Tồn kho thấp: {inventory}</p>}
                    {kind !== 'RETURN' && <button type="button" className="adm-btn" disabled={lines.length === 1} onClick={() => setLines(s => s.filter((_,i) => i !== index))}>Xóa dòng</button>}</section>;
                })}
                {kind !== 'RETURN' && <button type="button" className="adm-btn" onClick={() => setLines(s => [...s,newLine()])}>Thêm dòng hàng</button>}
                <p>Tổng tiền: <strong>{money(lineTotal)}</strong>{kind === 'RETURN' && <> · Phí 5%: {money(lineTotal*.05)} · Công ty nhận: {money(lineTotal*.95)}</>}</p>
                {mode !== 'batches' && <label className="wf-field"><span>Ghi chú</span><textarea maxLength={1000} value={note} onChange={e => setNote(e.target.value)}/></label>}
            </>}
            <button className="adm-btn adm-btn-primary" disabled={pending || mode === 'inbound' && !selected.length || !lines.length}>{pending ? 'Đang xử lý…' : mode === 'batches' ? 'Tạo lô hàng' : mode === 'inbound' ? manager ? 'Gửi yêu cầu nhập' : 'Thanh toán & nhập kho' : 'Tạo đơn'}</button>
        </fieldset></form>}
        {mode === 'batches' ? batches.map(batch => <section className="wf-card" key={String(batch.id)}><h3>{String(batch.code)} · {labels[String(batch.status)] || String(batch.status)}</h3><div className="workspace-table"><table><thead><tr>{['Dòng hàng','SKU','Mặt hàng','Số lượng','Đơn vị','Đơn giá niêm yết','Tổng tiền'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows(batch.lines).map((line,i) => <tr key={i}><td>{i+1}</td><td>{String(line.sku)}</td><td>{String(line.name)}</td><td>{number(line.quantity)}</td><td>{String(line.unit)}</td><td>{money(line.unitPrice)}</td><td>{money(line.total)}</td></tr>)}</tbody></table></div><strong>{money(batchTotal(batch))}</strong></section>) : <section className="wf-card"><h3>Danh sách nghiệp vụ</h3>{visible.map(op => <article className="wf-card" key={String(op.id)}><h4>{labels[String(op.kind)]} · {String(op.id)}</h4><p>{labels[String(op.status)] || String(op.status)} · {money(op.amount)} · {String(scope.warehouses.find(w => w.id === op.warehouseId)?.name || '')}</p>
            {op.kind === 'SALE' && <p>{String(object(op.details).recipientName || '')} · {String(object(op.details).recipientAddress || '')} · {String(object(op.details).recipientPhone || '')}</p>}
            <div className="workspace-table"><table><thead><tr><th>Lô</th><th>SKU</th><th>Tên mặt hàng</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>{rows(op.lines).map((line,i) => <tr key={i}><td>{String(line.batchCode)}</td><td>{String(line.sku)}</td><td>{String(line.name)}</td><td>{number(line.quantity)}</td><td>{money(line.unitPrice)}</td><td>{money(line.total)}</td></tr>)}</tbody></table></div>
            <div className="wf-form-actions">{(op.status === 'PENDING_APPROVAL' && !manager ? ['approve','reject'] : op.status === 'PAYMENT_PENDING' ? ['retry'] : op.kind === 'SALE' && op.status === 'READY' ? ['ship','complete'] : op.kind === 'SALE' && op.status === 'SHIPPING' ? ['complete'] : []).map(action => <button disabled={pending} key={action} className="adm-btn" onClick={() => void run(() => saveResource('inventory', `/warehouses/${op.warehouseId}/trade/operations/${op.id}/${action}`, 'POST'), 'Đã cập nhật nghiệp vụ.')} >{{ approve: 'Duyệt & thanh toán bằng tài khoản kho', reject: 'Từ chối', retry: 'Thử thanh toán lại', ship: 'Đang giao', complete: 'Hoàn thành & thu tiền' }[action]}</button>)}</div>
        </article>)}{!visible.length && <p>Chưa có nghiệp vụ phù hợp.</p>}</section>}
    </>;
}
