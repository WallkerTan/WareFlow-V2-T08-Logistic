import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { endpoint, mutate, query } from '../../services/api';
import { money, number, object, rows, text } from '../../services/api';
import type { Row } from '../../services/api';
import { getAuthSession } from '../../services/session';
import { useApi } from '../../hook/useApi';
import { useCollection } from '../../hook/useCollection';
import { useWorkspace } from '../../components/live/workspaceContext';
import Resource from '../../components/live/Resource';
import Editor, { Fields } from '../../components/live/Editor';
import type { Field, Values } from '../../components/live/Editor';
import { Add, Empty, Heading, Loading, Notice, Table, WarehousePicker } from '../../components/live/UI';
import { commonColumns as c, labels, status } from '../../components/live/presentation';
import { useAction } from '../../hook/useAction';
import { Modal } from '../../components/admin/AdminUI';
import { FilterForm } from './CorePages';

function prefix(role: string) { return role === 'SYSTEM_ADMIN' ? '/admin' : role === 'COMPANY_ADMIN' ? '/company' : '/storehouse'; }
export function ProductsPage() {
    const { warehouseId, session } = useWorkspace(); const [belowMin, setBelowMin] = useState(false);
    const editable = session.role === 'WAREHOUSE_MANAGER';
    return <><WarehousePicker required />{warehouseId && <Resource key={`${warehouseId}-${belowMin}`} title="Danh mục hàng hóa" service="inventory" path={`/warehouses/${warehouseId}/products${query({ belowMin: belowMin || undefined })}`}
        fields={[{ name: 'sku', label: 'SKU', required: true }, { name: 'barcode', label: 'Mã vạch' }, { name: 'name', label: 'Tên sản phẩm', required: true }, { name: 'unit', label: 'Đơn vị tính' }, { name: 'minStock', label: 'Tồn tối thiểu', type: 'number', min: 0 }, { name: 'images', label: 'Ảnh sản phẩm', type: 'images' }]}
        payload={v => ({ sku: v.sku, barcode: v.barcode || null, name: v.name, unit: v.unit || null, minStock: v.minStock ? number(v.minStock) : null, images: JSON.parse(v.images || '[]') })}
        canCreate={editable} canEdit={editable} canDelete={editable}
        toolbar={<label className="live-checkbox"><input type="checkbox" checked={belowMin} onChange={e => setBelowMin(e.target.checked)} />Chỉ hàng dưới tồn tối thiểu</label>}
        columns={[{ key: 'images', label: 'Ảnh', render: r => Array.isArray(r.images) && r.images[0] ? <img className="live-thumbnail" src={String(r.images[0])} alt={text(r.name)} /> : '—' }, { key: 'sku', label: 'SKU' }, c.name, { key: 'barcode', label: 'Mã vạch' }, { key: 'unit', label: 'Đơn vị' }, { key: 'quantity', label: 'Tồn thực tế' }, { key: 'available', label: 'Khả dụng' }, { key: 'minStock', label: 'Tồn tối thiểu' }, { key: 'belowMinStock', label: 'Cảnh báo', render: r => r.belowMinStock ? status('LOW_STOCK') : '—' }]}
        actions={r => <Link className="adm-btn" to={`${prefix(session.role)}/lots?productId=${r.id}`}>Lô hàng</Link>} />}</>;
}
export function LotsPage() {
    const { warehouseId, session } = useWorkspace(); const [params, setParams] = useSearchParams(); const products = useCollection('inventory', warehouseId ? `/warehouses/${warehouseId}/products` : null);
    const productId = params.get('productId') || String(products.data[0]?.id || ''); const [revision, setRevision] = useState(0);
    const action = useAction(() => setRevision(v => v + 1)); const editable = session.role === 'WAREHOUSE_MANAGER';
    return <><WarehousePicker required />{products.error && <Notice error>{products.error}</Notice>}<label className="live-select-label">Sản phẩm<select value={productId} onChange={e => setParams({ productId: e.target.value })}><option value="">Chọn sản phẩm</option>{products.data.map(r => <option key={String(r.id)} value={String(r.id)}>{text(r.sku)} · {text(r.name)}</option>)}</select></label>{action.notice}
        {warehouseId && productId && <Resource key={`${warehouseId}-${productId}-${revision}`} title="Lô hàng & hạn sử dụng" service="inventory" path={`/warehouses/${warehouseId}/products/${productId}/lots`} canCreate={editable} canEdit={editable} canDelete={editable}
            fields={[{ name: 'lotCode', label: 'Mã lô', required: true }, { name: 'expiryDate', label: 'Hạn sử dụng', type: 'date' }]} payload={v => ({ lotCode: v.lotCode, expiryDate: v.expiryDate || null })}
            columns={[{ key: 'lotCode', label: 'Mã lô' }, { key: 'expiryDate', label: 'Hạn sử dụng' }, { key: 'quantity', label: 'Tồn thực tế' }, { key: 'reserved', label: 'Đã giữ' }, { key: 'available', label: 'Khả dụng' }, c.status]}
            actions={r => editable && <button className="adm-btn" disabled={action.pending} onClick={() => void action.run(() => mutate('inventory', `/warehouses/${warehouseId}/products/${productId}/lots/${r.id}/condition?status=${r.status === 'DAMAGED' ? 'OK' : 'DAMAGED'}`, 'PATCH'))}>{r.status === 'DAMAGED' ? 'Khôi phục tình trạng' : 'Đánh dấu hư hỏng'}</button>} />}
        {!products.loading && !products.error && !products.data.length && <Empty>Chưa có sản phẩm trong kho.</Empty>}</>;
}
export function AlertsPage() {
    const { warehouseId } = useWorkspace(); const resource = useApi<Row[]>('inventory', warehouseId ? `/warehouses/${warehouseId}/alerts` : null);
    return <><WarehousePicker required /><Heading title="Cảnh báo hàng hóa" />{resource.loading && <Loading />}{resource.error && <Notice error>{resource.error}</Notice>}{resource.data && <Table rows={resource.data} columns={[{ key: 'type', label: 'Cảnh báo', render: r => status(r.type) }, { key: 'sku', label: 'SKU' }, { key: 'quantity', label: 'Số lượng' }, { key: 'minimum', label: 'Mức tối thiểu' }, { key: 'expiryDate', label: 'Hạn sử dụng' }]} />}</>;
}
export function MovementsPage() {
    const { warehouseId } = useWorkspace(); const [filters, setFilters] = useState<Values>({});
    const productOptions = useCollection('inventory', warehouseId ? `/warehouses/${warehouseId}/products` : null);
    const products = productOptions.data.map(r => ({ value: String(r.id), label: `${text(r.sku)} · ${text(r.name)}` }));
    return <><WarehousePicker required />{warehouseId && <Resource title="Sổ biến động & truy vết" service="inventory" path={`/warehouses/${warehouseId}/movements${query({ ...filters, from: filters.from ? new Date(filters.from).toISOString() : undefined, to: filters.to ? new Date(`${filters.to}T23:59:59.999`).toISOString() : undefined })}`}
        description="Lịch sử không sửa/xóa. Chênh lệch được xử lý bằng phiếu điều chỉnh."
        toolbar={<FilterForm fields={[{ name: 'from', label: 'Từ ngày', type: 'date' }, { name: 'to', label: 'Đến ngày', type: 'date' }, { name: 'productId', label: 'Sản phẩm', type: 'select', options: products }, { name: 'actorId', label: 'Mã người thao tác' }, { name: 'lotId', label: 'Mã lô truy vết (UUID)' }, { name: 'documentType', label: 'Loại phiếu', type: 'select', options: ['RECEIPT', 'EXPORT_SALE', 'EXPORT_TRANSFER', 'EXPORT_DESTROY', 'EXPORT_RETURN', 'ADJUST'].map(value => ({ value, label: labels[value] })) }]} onApply={setFilters} />}
        columns={[{ key: 'sku', label: 'SKU' }, { key: 'lotCode', label: 'Lô' }, { key: 'documentType', label: 'Loại phiếu', render: r => status(r.documentType) }, { key: 'qtyChange', label: 'Biến động' }, { key: 'actorId', label: 'Người thao tác' }, { key: 'documentId', label: 'Mã phiếu' }, { key: 'note', label: 'Ghi chú' }, c.created]} />}</>;
}

export type DocumentMode = 'PO' | 'RECEIPT' | 'EXPORT' | 'STOCKTAKE' | 'ADJUST';
const collections: Record<DocumentMode, string> = { PO: 'purchase-orders', RECEIPT: 'receipts', EXPORT: 'exports', STOCKTAKE: 'stocktakes', ADJUST: 'adjustments' };
const titles: Record<DocumentMode, string> = { PO: 'Đơn đặt hàng', RECEIPT: 'Phiếu nhận hàng', EXPORT: 'Phiếu xuất hàng', STOCKTAKE: 'Kiểm kê', ADJUST: 'Phiếu điều chỉnh' };
export function DocumentLines({ document }: { document: Row }) {
    return <><p>Mã phiếu: {text(document.id)} · {labels[String(document.status)]}</p><Table rows={rows(document.lines)} columns={[{ key: 'sku', label: 'SKU' }, { key: 'lotCode', label: 'Lô' }, { key: 'qty', label: 'Đặt / xuất', render: r => text(r.qty ?? r.quantity) }, { key: 'price', label: 'Đơn giá', render: r => r.price == null ? '—' : money(r.price) }, { key: 'receivedQty', label: 'Đã nhận' }, { key: 'systemQuantity', label: 'Tồn lúc đếm' }, { key: 'countedQuantity', label: 'Thực đếm' }, { key: 'variance', label: 'Chênh lệch' }, { key: 'delta', label: 'Điều chỉnh' }, { key: 'expiryDate', label: 'Hạn dùng' }]} />{object(document.approval).adjustmentId && <Notice>Phiếu điều chỉnh đã được tạo: {text(object(document.approval).adjustmentId)}. Vào mục Điều chỉnh để duyệt và hoàn tất.</Notice>}</>;
}
export function DocumentsPage({ mode, transfers = false }: { mode: DocumentMode; transfers?: boolean }) {
    const { warehouseId, session } = useWorkspace(); const [revision, setRevision] = useState(0); const [filter, setFilter] = useState('');
    const [creating, setCreating] = useState<{ mode: DocumentMode; initial?: Row } | null>(() => location.pathname.endsWith('/new') ? { mode, initial: transfers ? { type: 'EXPORT_TRANSFER' } : undefined } : null); const [view, setView] = useState<Row | null>(null);
    const [decision, setDecision] = useState<{ row: Row; action: string } | null>(null); const reloadRef = useRef<() => void>(() => {});
    const mutation = useAction(() => { reloadRef.current(); setRevision(v => v + 1); });
    const writable = session.role !== 'SYSTEM_ADMIN'; const reviewer = session.role !== 'WAREHOUSE_MANAGER';
    const base = `/warehouses/${warehouseId}/${collections[mode]}`;
    async function transition(row: Row, action: string, note?: string) { await mutate('inventory', `${base}/${row.id}/${action}`, 'POST', { note }); setRevision(v => v + 1); }
    return <><WarehousePicker required />{mutation.notice}{warehouseId && <Resource key={`${warehouseId}-${mode}-${revision}`} title={transfers ? 'Điều chuyển giữa các kho' : titles[mode]} service="inventory" path={`${base}${query({ status: filter, type: transfers ? 'EXPORT_TRANSFER' : undefined })}`}
        toolbar={<div className="live-toolbar"><label>Trạng thái<select value={filter} onChange={e => setFilter(e.target.value)}><option value="">Tất cả</option>{['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'DONE', 'CANCELLED'].map(value => <option key={value} value={value}>{labels[value]}</option>)}</select></label>{writable && mode !== 'RECEIPT' && <Add label={transfers ? 'Tạo điều chuyển' : `Tạo ${titles[mode].toLowerCase()}`} onClick={() => setCreating({ mode, initial: transfers ? { type: 'EXPORT_TRANSFER' } : undefined })} />}{mode === 'PO' && <Link className="adm-btn" to={`${prefix(session.role)}/receipts`}>Phiếu nhận hàng</Link>}</div>}
        columns={[{ key: 'id', label: 'Mã phiếu' }, { key: 'type', label: 'Loại', render: r => status(r.type) }, c.status, { key: 'approval.totalAmount', label: 'Tổng tiền', render: r => object(r.approval).totalAmount == null ? '—' : money(object(r.approval).totalAmount) }, { key: 'approval.supplierName', label: 'Nhà cung cấp' }, c.created]}
        actions={(r, reload) => {
            const stage = String(r.status); const approval = object(r.approval);
            function action(op: string) { reloadRef.current = reload; if (['approve', 'reject', 'cancel'].includes(op)) setDecision({ row: r, action: op }); else void mutation.run(() => transition(r, op)); }
            return <><button className="adm-btn" onClick={() => setView(r)}>Chi tiết</button><button className="adm-btn" disabled={mutation.pending} onClick={() => void mutation.run(() => printDocument(warehouseId, String(r.id)), 'Đã mở phiếu để in.')}>In phiếu</button>
                {writable && stage === 'DRAFT' && <><button className="adm-btn" disabled={mutation.pending} onClick={() => action('submit')}>Gửi duyệt</button>{mode === 'PO' && <button className="adm-btn" onClick={() => setCreating({ mode: 'PO', initial: r })}>Sửa đơn</button>}</>}
                {reviewer && stage === 'PENDING_APPROVAL' && <><button className="adm-btn" disabled={mutation.pending} onClick={() => action('approve')}>Duyệt</button><button className="adm-btn" disabled={mutation.pending} onClick={() => action('reject')}>Từ chối</button></>}
                {writable && stage === 'APPROVED' && <>{mode === 'PO' ? <button className="adm-btn" onClick={() => setCreating({ mode: 'RECEIPT', initial: r })}>Nhận hàng</button> : mode !== 'RECEIPT' && <>
                    {mode === 'EXPORT' && !approval.pickAt && <button className="adm-btn" disabled={mutation.pending} onClick={() => action('pick')}>Đã lấy hàng</button>}
                    {mode === 'EXPORT' && !!approval.pickAt && !approval.packAt && <button className="adm-btn" disabled={mutation.pending} onClick={() => action('pack')}>Đã đóng gói</button>}
                    {(mode !== 'EXPORT' || r.type !== 'EXPORT_SALE' || !!approval.packAt) && <button className="adm-btn" disabled={mutation.pending} onClick={() => action('complete')}>Hoàn tất</button>}
                </>}</>}
                {writable && mode !== 'RECEIPT' && ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(stage) && <button className="adm-btn" disabled={mutation.pending} onClick={() => action('cancel')}>Hủy</button>}
                {mode === 'EXPORT' && r.type === 'EXPORT_SALE' && stage === 'DONE' && writable && <Link className="adm-btn" to={`${prefix(session.role)}/shipments?documentId=${r.id}`}>Tạo vận đơn</Link>}
            </>;
        }} />}
        {view && <Modal title={titles[mode]} onClose={() => setView(null)}><DocumentLines document={view} /></Modal>}
        {decision && <Editor title={`${decision.action === 'approve' ? 'Duyệt' : decision.action === 'reject' ? 'Từ chối' : 'Hủy'} ${titles[mode].toLowerCase()}`} fields={[{ name: 'note', label: 'Lý do / ghi chú', type: 'textarea', required: decision.action !== 'approve' }]} onClose={() => setDecision(null)} onSave={v => transition(decision.row, decision.action, v.note)} />}
        {creating && warehouseId && <DocumentForm key={`${warehouseId}-${creating.mode}-${creating.initial?.id || 'new'}`} warehouseId={warehouseId} mode={creating.mode} initial={creating.initial} onClose={() => setCreating(null)} onSaved={() => setRevision(v => v + 1)} />}</>;
}
async function printDocument(warehouse: string, id: string) {
    const preview = window.open('', '_blank');
    if (!preview) throw new Error('Cho phép mở cửa sổ mới để xem phiếu in.');
    preview.opener = null;
    try {
        const response = await fetch(endpoint('inventory', `/warehouses/${warehouse}/documents/${id}/print`), { headers: { Authorization: `Bearer ${getAuthSession()?.accessToken || ''}` }, signal: AbortSignal.timeout(20000) });
        if (!response.ok) throw new Error('Không tải được phiếu in.');
        const url = URL.createObjectURL(new Blob([await response.text()], { type: 'text/html;charset=utf-8' })); preview.location.href = url; window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) { preview.close(); throw error; }
}
function LotPicker({ warehouseId, productId, value, onChange }: { warehouseId: string; productId: string; value: string; onChange: (value: string) => void }) {
    const data = useApi<Row[]>('inventory', productId ? `/warehouses/${warehouseId}/products/${productId}/lots` : null);
    return <label>Lô hàng *<select aria-label="Lô hàng" required value={value} onChange={e => onChange(e.target.value)}><option value="">{data.loading ? 'Đang tải lô…' : 'Chọn lô'}</option>{data.data?.map(r => <option key={String(r.id)} value={String(r.id)}>{text(r.lotCode)} · khả dụng {text(r.available)} · {labels[String(r.status)] || ''}</option>)}</select>{data.error && <small role="alert">{data.error}</small>}</label>;
}
function TargetProducts({ warehouseId, value, onChange }: { warehouseId: string; value: string; onChange: (value: string) => void }) {
    const data = useCollection('inventory', warehouseId ? `/warehouses/${warehouseId}/products` : null);
    return <label>Sản phẩm ở kho nhận *<select required value={value} onChange={e => onChange(e.target.value)}><option value="">Chọn SKU tương ứng</option>{data.data.map(r => <option key={String(r.id)} value={String(r.id)}>{text(r.sku)} · {text(r.name)} ({text(r.unit)})</option>)}</select>{data.error && <small role="alert">{data.error}</small>}</label>;
}
function DocumentForm({ mode, warehouseId, initial, onSaved, onClose }: { mode: DocumentMode; warehouseId: string; initial?: Row; onSaved: () => void; onClose: () => void }) {
    const { warehouses, session } = useWorkspace();
    const products = useCollection('inventory', `/warehouses/${warehouseId}/products`);
    const suppliers = useCollection('core', mode === 'PO' ? '/suppliers' : null);
    const approval = object(initial?.approval);
    const [header, setHeader] = useState<Values>({ type: String(initial?.type || 'EXPORT_SALE'), supplierId: String(approval.supplierId || ''), supplierName: String(approval.supplierName || ''), targetWarehouseId: String(initial?.targetWarehouseId || ''), expectedDeliveryDate: String(approval.expectedDeliveryDate || ''), note: String(approval.note || '') });
    const [lines, setLines] = useState<Values[]>(() => initial?.lines ? rows(initial.lines).filter(r => mode !== 'RECEIPT' || number(r.qty) > number(r.receivedQty)).map(r => ({ key: crypto.randomUUID(), productId: String(r.productId || ''), lotId: String(r.lotId || ''), qty: String(mode === 'RECEIPT' ? Math.max(0, number(r.qty) - number(r.receivedQty)) : r.qty || r.quantity || ''), price: String(r.price || '0'), lotCode: '', expiryDate: '', condition: 'OK', countedQuantity: '', delta: '', targetProductId: String(r.targetProductId || '') })) : [{ key: crypto.randomUUID(), productId: '', lotId: '', qty: '', price: '0', lotCode: '', expiryDate: '', condition: 'OK', countedQuantity: '', delta: '', targetProductId: '' }]);
    const [pending, setPending] = useState(false); const [error, setError] = useState('');
    const transfer = mode === 'EXPORT' && header.type === 'EXPORT_TRANSFER';
    const headerFields: Field[] = [{ name: 'note', label: 'Ghi chú', type: 'textarea' }];
    if (mode === 'PO') headerFields.unshift({ name: 'supplierId', label: 'Nhà cung cấp', type: 'select', options: suppliers.data.map(r => ({ value: String(r.id), label: text(r.name) })) }, { name: 'supplierName', label: 'Tên nhà cung cấp (nếu nhập thủ công)' }, { name: 'expectedDeliveryDate', label: 'Ngày dự kiến nhận', type: 'date' });
    if (mode === 'EXPORT') headerFields.unshift({ name: 'type', label: 'Loại xuất', type: 'select', required: true, options: (session.role === 'COMPANY_ADMIN' ? ['EXPORT_SALE', 'EXPORT_TRANSFER', 'EXPORT_DESTROY', 'EXPORT_RETURN'] : ['EXPORT_SALE', 'EXPORT_DESTROY', 'EXPORT_RETURN']).map(value => ({ value, label: labels[value] })) });
    if (transfer) headerFields.unshift({ name: 'targetWarehouseId', label: 'Kho nhận', type: 'select', required: true, options: warehouses.filter(r => String(r.id) !== warehouseId).map(r => ({ value: String(r.id), label: text(r.name) })) });
    function updateLine(index: number, values: Values) { setLines(previous => previous.map((line, i) => i === index ? values : line)); }
    async function save() {
        const converted = lines.map(line => mode === 'PO' ? { productId: line.productId, qty: number(line.qty), price: number(line.price) }
            : mode === 'RECEIPT' ? { productId: line.productId, receivedQty: number(line.qty), lotCode: line.lotCode, expiryDate: line.expiryDate || null, condition: line.condition || 'OK' }
                : mode === 'EXPORT' ? { lotId: line.lotId, quantity: number(line.qty), targetProductId: transfer ? line.targetProductId : null }
                    : mode === 'STOCKTAKE' ? { productId: line.productId, lotId: line.lotId, countedQuantity: number(line.countedQuantity) }
                        : { lotId: line.lotId, delta: number(line.delta) });
        if (!lines.length) throw new Error('Phiếu phải có ít nhất một dòng hàng.');
        if (mode === 'ADJUST' && lines.some(l => number(l.delta) === 0)) throw new Error('Số lượng điều chỉnh phải khác 0.');
        const body = mode === 'PO' ? { supplierId: header.supplierId || null, supplierName: suppliers.data.find(r => r.id === header.supplierId)?.name || header.supplierName || null, expectedDeliveryDate: header.expectedDeliveryDate || null, submitImmediately: false, note: header.note, lines: converted }
            : mode === 'RECEIPT' ? { poId: initial?.id, completePo: true, note: header.note, lines: converted }
                : mode === 'EXPORT' ? { type: header.type, targetWarehouseId: transfer ? header.targetWarehouseId : null, note: header.note, lines: converted }
                    : { note: header.note, lines: converted };
        await mutate('inventory', `/warehouses/${warehouseId}/${collections[mode]}${mode === 'PO' && initial?.id ? `/${initial.id}` : ''}`, mode === 'PO' && initial?.id ? 'PUT' : 'POST', body);
    }
    return <Modal title={mode === 'RECEIPT' ? 'Nhận hàng theo đơn đặt hàng' : `${initial?.id ? 'Cập nhật' : 'Tạo'} ${titles[mode].toLowerCase()}`} onClose={() => { if (!pending) onClose(); }}><form onSubmit={async e => {
        e.preventDefault(); if (pending) return; setPending(true); setError('');
        try { await save(); onSaved(); onClose(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tạo được phiếu.'); } finally { setPending(false); }
    }}><fieldset disabled={pending}><Fields fields={headerFields} values={header} setValues={setHeader} />{products.error && <Notice error>{products.error}</Notice>}{suppliers.error && <Notice error>{suppliers.error}</Notice>}
        {lines.map((line, index) => <section className="live-line" key={line.key}><h3>Dòng hàng {index + 1}</h3><div className="live-fields"><label>Sản phẩm *<select required value={line.productId} disabled={mode === 'RECEIPT'} onChange={e => updateLine(index, { ...line, productId: e.target.value, lotId: '' })}><option value="">Chọn sản phẩm</option>{products.data.map(r => <option key={String(r.id)} value={String(r.id)}>{text(r.sku)} · {text(r.name)}</option>)}</select></label>
            {['EXPORT', 'STOCKTAKE', 'ADJUST'].includes(mode) && <LotPicker warehouseId={warehouseId} productId={line.productId} value={line.lotId} onChange={value => updateLine(index, { ...line, lotId: value })} />}
            {transfer && <TargetProducts warehouseId={header.targetWarehouseId} value={line.targetProductId} onChange={value => updateLine(index, { ...line, targetProductId: value })} />}
            <label>{mode === 'STOCKTAKE' ? 'Số lượng thực đếm' : mode === 'ADJUST' ? 'Chênh lệch (+ tăng, − giảm)' : mode === 'RECEIPT' ? 'Số lượng thực nhận' : 'Số lượng'} *<input type="number" required step="0.01" min={mode === 'ADJUST' ? undefined : mode === 'STOCKTAKE' ? 0 : 0.01} value={line[mode === 'STOCKTAKE' ? 'countedQuantity' : mode === 'ADJUST' ? 'delta' : 'qty']} onChange={e => updateLine(index, { ...line, [mode === 'STOCKTAKE' ? 'countedQuantity' : mode === 'ADJUST' ? 'delta' : 'qty']: e.target.value })} /></label>
            {mode === 'PO' && <label>Đơn giá (VNĐ) *<input type="number" required min="0" step="0.01" value={line.price} onChange={e => updateLine(index, { ...line, price: e.target.value })} /></label>}
            {mode === 'RECEIPT' && <><label>Mã lô nhận *<input required value={line.lotCode} onChange={e => updateLine(index, { ...line, lotCode: e.target.value })} /></label><label>Hạn sử dụng<input type="date" value={line.expiryDate} onChange={e => updateLine(index, { ...line, expiryDate: e.target.value })} /></label><label>Tình trạng<select value={line.condition} onChange={e => updateLine(index, { ...line, condition: e.target.value })}><option value="OK">Bình thường</option><option value="DAMAGED">Hư hỏng</option></select></label></>}
        </div><button className="adm-btn" type="button" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, i) => i !== index))}>Bỏ dòng</button></section>)}
        {mode !== 'RECEIPT' && <button className="adm-btn" type="button" onClick={() => setLines([...lines, { key: crypto.randomUUID(), productId: '', lotId: '', qty: '', price: '0', lotCode: '', expiryDate: '', condition: 'OK', countedQuantity: '', delta: '', targetProductId: '' }])}>Thêm dòng hàng</button>}
        {error && <Notice error>{error}</Notice>}<div className="live-actions live-form-actions"><button className="adm-btn" type="button" onClick={onClose}>Hủy</button><button className="adm-btn adm-btn-primary" type="submit" disabled={products.loading || !!products.error || !products.data.length}>{pending ? 'Đang lưu…' : mode === 'RECEIPT' ? 'Xác nhận nhận hàng' : 'Lưu phiếu'}</button></div>
    </fieldset></form></Modal>;
}
