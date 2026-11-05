import { useEffect, useState } from 'react';
import { Alert, AutoComplete, Button, Checkbox, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, message } from 'antd';
import { inboundApi } from '../../services/inboundApi';
import type { CreatePo, Page, Product, StockDocument, PoStatus } from '../../services/inboundApi';
import './StorehouseInbound.css';
const labels: Record<PoStatus, string> = { DRAFT: 'Bản nháp', PENDING_APPROVAL: 'Chờ duyệt', APPROVED: 'Chờ nhận hàng', DONE: 'Hoàn tất', CANCELLED: 'Đã hủy' };
const money = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
const errorText = (e: unknown) => e instanceof Error ? e.message : 'Không kết nối được dịch vụ kho.';
const initialWarehouse = () => sessionStorage.getItem('wareflow.inbound.warehouse') || import.meta.env.VITE_WAREHOUSE_ID || '';
type ReceiptRow = { productId: string; receivedQty: number; lotCode: string; expiryDate: string };
export default function StorehouseInboundPage({ initialCreate = false }: { initialCreate?: boolean }) {
 const [warehouse, setWarehouse] = useState(initialWarehouse);
 const [draftWarehouse, setDraftWarehouse] = useState(initialWarehouse);
 const [status, setStatus] = useState(''); const [page, setPage] = useState(0);
 const [data, setData] = useState<Page<StockDocument>>({ content: [], totalElements: 0, totalPages: 0 });
 const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [revision, setRevision] = useState(0);
 const [creating, setCreating] = useState(initialCreate); const [products, setProducts] = useState<Product[]>([]);
 const [catalogLoading, setCatalogLoading] = useState(false); const [catalogError, setCatalogError] = useState('');
 const [selected, setSelected] = useState<StockDocument | null>(null); const [receipt, setReceipt] = useState<ReceiptRow[]>([]);
 const [note, setNote] = useState(''); const [completePo, setCompletePo] = useState(true); const [busy, setBusy] = useState(false);
 const [form] = Form.useForm<CreatePo>(); const lines = Form.useWatch('lines', form) || []; const [toast, context] = message.useMessage();
 useEffect(() => {
  if (!warehouse) return; let active = true;
  // Start loading with the asynchronous request lifecycle.
  void Promise.resolve().then(() => { if (active) { setLoading(true); setError(''); } });
  inboundApi.list(warehouse, status, page).then(r => { if(active) setData(r); }).catch(e => { if(active) { setError(errorText(e)); setData({content:[],totalElements:0,totalPages:0}); } }).finally(() => { if(active) setLoading(false); });
  return () => { active = false; };
 }, [warehouse,status,page,revision]);
 useEffect(() => {
  if (!warehouse || !creating) return; let active = true;
  void Promise.resolve().then(() => { if (active) { setCatalogLoading(true); setCatalogError(''); setProducts([]); } });
  inboundApi.products(warehouse).then(r => { if(active) setProducts(r); }).catch(e => { if(active) setCatalogError(errorText(e)); }).finally(() => { if(active) setCatalogLoading(false); });
  return () => { active = false; };
 }, [warehouse,creating,revision]);
 async function create(values: CreatePo) {
  if (busy) return;
  if (new Set(values.lines.map(l => l.productId)).size !== values.lines.length) { toast.error('Mỗi sản phẩm chỉ thêm một lần.'); return; }
  setBusy(true);
  try { await inboundApi.create(warehouse,{...values,supplierName:values.supplierName.trim(),expectedDeliveryDate:values.expectedDeliveryDate || undefined,note:values.note || ''}); form.resetFields(); setCreating(false); setPage(0); setRevision(r=>r+1); toast.success('Đã tạo PO.'); }
  catch(e) { toast.error(errorText(e)); } finally { setBusy(false); }
 }
 async function openOrder(po: StockDocument) {
  setBusy(true);
  try { const fresh = await inboundApi.detail(warehouse,po.id); setSelected(fresh); setNote(''); setCompletePo(true); setReceipt(fresh.lines.map(l=>({productId:l.productId,receivedQty:0,lotCode:'',expiryDate:''}))); }
  catch(e) { toast.error(errorText(e)); } finally { setBusy(false); }
 }
 async function saveReceipt() {
  if (!selected || busy) return; const receiving = receipt.filter(r=>r.receivedQty>0);
  if (!receiving.length || receiving.some(r=>!r.lotCode.trim())) { toast.error('Nhập số lượng và mã lô cho ít nhất một sản phẩm.'); return; }
  if (receiving.some(r=>{ const line=selected.lines.find(l=>l.productId===r.productId)!; return !Number.isFinite(r.receivedQty) || r.receivedQty>Number(line.qty)-Number(line.receivedQty); })) { toast.error('Không được nhận vượt số lượng còn lại.'); return; }
  setBusy(true);
  try { await inboundApi.receive(warehouse,{poId:selected.id,note:note.trim(),completePo,lines:receiving.map(r=>({...r,lotCode:r.lotCode.trim(),expiryDate:r.expiryDate || undefined}))}); setSelected(null); setRevision(r=>r+1); toast.success('Đã ghi nhận nhập kho.'); }
  catch(e) { toast.error(errorText(e)); } finally { setBusy(false); }
 }
 async function submit() {
  if (!selected || busy) return; setBusy(true);
  try { await inboundApi.submit(warehouse,selected.id); setSelected(null); setRevision(r=>r+1); toast.success('Đã gửi duyệt.'); }
  catch(e) { toast.error(errorText(e)); } finally { setBusy(false); }
 }
 const update = (i:number, patch:Partial<ReceiptRow>) => setReceipt(rows=>rows.map((r,index)=>index===i?{...r,...patch}:r));
 return <div className="inbound-page">{context}
  <header className="inbound-heading"><div><small>KHO CON · MUA HÀNG & NHẬN HÀNG</small><h1>Nhập hàng hóa</h1><p>Theo dõi PO, đối chiếu thực nhận và nhập kho theo lô.</p></div><Button type="primary" size="large" disabled={!warehouse || busy || loading} onClick={()=>setCreating(true)}>+ Tạo đơn PO</Button></header>
  <section className="inbound-panel"><Form layout="inline" onFinish={()=>{
   if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(draftWarehouse.trim())) { toast.error('Mã kho phải là UUID hợp lệ.'); return; }
   const value=draftWarehouse.trim(); sessionStorage.setItem('wareflow.inbound.warehouse',value); setWarehouse(value); setPage(0); setSelected(null); form.resetFields(); setRevision(r=>r+1);
  }}><Form.Item label="Mã kho"><Input aria-label="Mã kho" placeholder="UUID kho được phân quyền" value={draftWarehouse} disabled={busy} onChange={e=>setDraftWarehouse(e.target.value)} /></Form.Item><Button htmlType="submit" disabled={busy}>Áp dụng</Button></Form></section>
  {!warehouse && <Alert showIcon type="info" title="Nhập mã kho được phân quyền để bắt đầu." />}
  {error && <Alert showIcon type="error" title={error} action={<Button onClick={()=>setRevision(r=>r+1)}>Thử lại</Button>} />}
  <section className="inbound-panel"><div className="inbound-toolbar"><div><h2>Đơn đặt hàng (PO)</h2><span>{data.totalElements} đơn theo bộ lọc</span></div><Space wrap><Select aria-label="Lọc trạng thái PO" value={status} style={{width:200}} onChange={s=>{setStatus(s);setPage(0);}} options={[{value:'',label:'Tất cả trạng thái'},...Object.entries(labels).map(([value,label])=>({value,label}))]} /><Button disabled={!warehouse || loading} onClick={()=>setRevision(r=>r+1)}>Làm mới</Button></Space></div>
  <Table<StockDocument> rowKey="id" loading={loading} dataSource={warehouse?data.content:[]} scroll={{x:950}} locale={{emptyText:'Chưa có đơn đặt hàng'}} pagination={{current:page+1,pageSize:10,total:data.totalElements,showSizeChanger:false,onChange:p=>setPage(p-1)}} columns={[
   {title:'Mã PO',dataIndex:'id',render:(id:string)=><span title={id}>PO-{id.slice(0,8).toUpperCase()}</span>},
   {title:'Nhà cung cấp',render:(_,po)=>po.approval?.supplierName || '—'},
   {title:'Ngày tạo',render:(_,po)=>new Date(po.createdAt).toLocaleDateString('vi-VN')},
   {title:'Dự kiến giao',render:(_,po)=>po.approval?.expectedDeliveryDate || '—'},
   {title:'Tổng tiền',render:(_,po)=>money(Number(po.approval?.totalAmount || 0))},
   {title:'Trạng thái',render:(_,po)=><Tag color={po.status==='DONE'?'green':po.status==='APPROVED'?'blue':'default'}>{labels[po.status] || po.status}</Tag>},
   {title:'Thao tác',render:(_,po)=><Button disabled={busy} onClick={()=>openOrder(po)}>{po.status==='APPROVED'?'Nhận hàng':'Chi tiết'}</Button>},
  ]} /></section>
  <Modal title="Tạo đơn đặt hàng (PO)" open={creating} width={950} footer={null} closable={!busy} maskClosable={!busy} onCancel={()=>!busy && setCreating(false)}>
   {catalogError && <Alert type="error" title={catalogError} action={<Button onClick={()=>setRevision(r=>r+1)}>Thử lại</Button>} />}
   <Form form={form} layout="vertical" onFinish={create} disabled={busy} initialValues={{lines:[{qty:1,price:0}],submitImmediately:true}}>
    <div className="inbound-fields"><Form.Item name="supplierName" label="Nhà cung cấp" rules={[{required:true,whitespace:true,message:'Nhập tên nhà cung cấp'}]}><AutoComplete placeholder="Chọn hoặc nhập tên nhà cung cấp" options={[...new Set(data.content.map(po=>po.approval?.supplierName).filter((name): name is string=>!!name))].map(name=>({value:name}))} filterOption={(input,option)=>(option?.value || '').toLowerCase().includes(input.toLowerCase())} /></Form.Item><Form.Item name="expectedDeliveryDate" label="Ngày dự kiến giao"><Input type="date" /></Form.Item></div>
    <Form.List name="lines">{(fields,{add,remove})=><>{fields.map(field=><div className="inbound-line" key={field.key}>
     <Form.Item name={[field.name,'productId']} label="Sản phẩm" rules={[{required:true,message:'Chọn sản phẩm'}]}><Select showSearch optionFilterProp="label" loading={catalogLoading} placeholder="Chọn sản phẩm trong kho" options={products.map(p=>({value:p.id,label:`${p.sku} · ${p.name} (${p.unit || 'ĐVT'})`}))} /></Form.Item>
     <Form.Item name={[field.name,'qty']} label="Số lượng" rules={[{required:true,type:'number',min:0.01,message:'Tối thiểu 0,01'}]}><InputNumber min={0.01} step={0.01} /></Form.Item>
     <Form.Item name={[field.name,'price']} label="Đơn giá (₫)" rules={[{required:true,type:'number',min:0,message:'Giá không được âm'}]}><InputNumber min={0} step={0.01} /></Form.Item>
     <Button danger disabled={fields.length===1 || busy} onClick={()=>remove(field.name)}>Xóa</Button>
    </div>)}<Button onClick={()=>add({qty:1,price:0})}>+ Thêm sản phẩm</Button></>}</Form.List>
    <p className="inbound-total">Tổng tiền: {money(lines.reduce((sum,l)=>sum+Number(l?.qty || 0)*Number(l?.price || 0),0))}</p>
    <Form.Item name="note" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item><Form.Item name="submitImmediately" valuePropName="checked"><Checkbox>Gửi duyệt ngay sau khi tạo</Checkbox></Form.Item>
    <div className="inbound-actions"><Button disabled={busy} onClick={()=>setCreating(false)}>Hủy</Button><Button type="primary" htmlType="submit" loading={busy} disabled={!warehouse || catalogLoading || !!catalogError || !products.length}>Tạo PO</Button></div>
   </Form>
  </Modal>
  <Modal title={selected?.status==='APPROVED'?'Nhận hàng theo PO':'Chi tiết đơn đặt hàng'} open={!!selected} width={1150} closable={!busy} maskClosable={!busy} onCancel={()=>!busy && setSelected(null)} footer={<Space><Button disabled={busy} onClick={()=>setSelected(null)}>Đóng</Button>{selected?.status==='DRAFT' && <Button loading={busy} type="primary" onClick={submit}>Gửi duyệt</Button>}{selected?.status==='APPROVED' && <Button loading={busy} type="primary" onClick={saveReceipt}>Xác nhận nhận hàng</Button>}</Space>}>
   {selected && <><p className="inbound-id">PO: {selected.id}</p><p>{selected.approval?.supplierName} · <Tag>{labels[selected.status]}</Tag></p>{selected.approval?.note && <p>Ghi chú: {selected.approval.note}</p>}
   <Table rowKey="productId" pagination={false} dataSource={selected.lines} scroll={{x:selected.status==='APPROVED'?1050:600}} columns={[
    {title:'Sản phẩm',render:(_,l)=><>{l.productName}<small className="inbound-sku">{l.sku} · {l.unit}</small></>},
    {title:'Đặt',dataIndex:'qty'},{title:'Đã nhận',dataIndex:'receivedQty'},
    {title:'Còn lại',render:(_,l)=>Number(l.qty)-Number(l.receivedQty)},
    ...(selected.status==='APPROVED'?[
     {title:'Thực nhận',render:(_:unknown,l:StockDocument['lines'][number],i:number)=><InputNumber aria-label={`Thực nhận ${l.productName}`} min={0} max={Number(l.qty)-Number(l.receivedQty)} disabled={busy || Number(l.qty)<=Number(l.receivedQty)} value={receipt[i]?.receivedQty} onChange={v=>update(i,{receivedQty:v || 0})} />},
     {title:'Mã lô',render:(_:unknown,l:StockDocument['lines'][number],i:number)=><Input aria-label={`Mã lô ${l.productName}`} disabled={busy || !receipt[i]?.receivedQty} value={receipt[i]?.lotCode} onChange={e=>update(i,{lotCode:e.target.value})} />},
     {title:'Hạn sử dụng',render:(_:unknown,l:StockDocument['lines'][number],i:number)=><Input type="date" aria-label={`Hạn sử dụng ${l.productName}`} disabled={busy || !receipt[i]?.receivedQty} value={receipt[i]?.expiryDate} onChange={e=>update(i,{expiryDate:e.target.value})} />},
     {title:'Chênh lệch',render:(_:unknown,l:StockDocument['lines'][number],i:number)=>{const diff=Number(receipt[i]?.receivedQty || 0)-(Number(l.qty)-Number(l.receivedQty));return <Tag color={diff===0?'green':'orange'}>{diff===0?'Đủ':`Thiếu ${Math.abs(diff)}`}</Tag>;}},
    ]:[{title:'Đơn giá',render:(_:unknown,l:StockDocument['lines'][number])=>money(Number(l.price))}]),
   ]} />
   {selected.status==='APPROVED' && <div className="inbound-receipt-note"><Alert showIcon type="info" title="Chênh lệch = thực nhận lần này − số lượng còn lại. Có thể nhận nhiều đợt; không nhận vượt PO." /><label>Ghi chú nhận hàng<Input.TextArea disabled={busy} rows={2} value={note} onChange={e=>setNote(e.target.value)} /></label><Checkbox disabled={busy} checked={completePo} onChange={e=>setCompletePo(e.target.checked)}>Hoàn tất PO khi tất cả sản phẩm đã nhận đủ</Checkbox></div>}</>}
  </Modal>
 </div>;
}
