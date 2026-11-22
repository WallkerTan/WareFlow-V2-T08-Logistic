import { useState } from 'react';
import { request } from '../../services/api';
import { saveResource,useAdminData } from '../../services/data';
import { getAuthSession } from '../../services/authApi';
import { useQuery } from '../../services/query';
import { useWorkspace } from '../../services/workspace';
import { formatCurrency } from '../../utils/format';
type Batch={id:string;code:string;lines:{sku:string;name:string}[];total:number};
type Order={id:string;status:string;warehousePayment:boolean;total:number;batches:Batch[]};
const statuses: Record<string,string>={PENDING:'Chờ duyệt',PROCESSING:'Đang quyết toán',DONE:'Đã nhập kho',CANCELLED:'Đã hủy'};
export default function BatchImportPage() {
    const {warehouseId,warehouses,selectWarehouse}=useWorkspace();
    const manager=getAuthSession()?.role==='WAREHOUSE_MANAGER';
    return <section><h2>Nhập hàng theo lô</h2><label>Kho nhận <select value={warehouseId} disabled={manager} onChange={e=>selectWarehouse(e.target.value)}>{warehouses.map(w=><option key={String(w.id)} value={String(w.id)}>{String(w.name)}</option>)}</select></label>
        {warehouseId && <ImportForm key={warehouseId} warehouse={warehouseId} manager={manager}/>}</section>;
}
function ImportForm({warehouse,manager}:{warehouse:string;manager:boolean}) {
    const batches=useQuery('purchase-batches',()=>request<Batch[]>('core','/purchase-batches'));
    const {raw}=useAdminData('products');
    const path='/warehouses/'+warehouse+'/batch-imports';
    const orders=useQuery(path,()=>request<Order[]>('inventory',path));
    const [selected,setSelected]=useState<string[]>([]);
    const [requestId,setRequestId]=useState(()=>crypto.randomUUID());
    const [busy,setBusy]=useState(false);
    const [error,setError]=useState('');
    const reservations=useQuery(path+'/reserved',()=>request<string[]>('inventory',path+'/reserved'));
    const reserved=new Set(reservations.data);
    const available=(batches.data||[]).filter(b=>!reserved.has(b.id));
    const chosen=available.filter(b=>selected.includes(b.id));
    const total=chosen.reduce((n,b)=>n+b.total,0);
    const fee=Math.round(total*5)/100;
    async function submit(action?:string) {
        if(busy)return;
        setBusy(true);setError('');
        try{
            await saveResource('inventory',path+(action||''),'POST',action?undefined:{requestId,batchIds:chosen.map(b=>b.id)});
            setSelected([]);setRequestId(crypto.randomUUID());
        }catch(e){setError(e instanceof Error?e.message:'Không thể cập nhật yêu cầu.');orders.reload();reservations.reload();}
        finally{setBusy(false);}
    }
    return <><fieldset disabled={busy} className="wf-card"><legend>Chọn lô nhập</legend>
        {available.map(b=><label key={b.id}><input type="checkbox" checked={selected.includes(b.id)} onChange={e=>{setSelected(e.target.checked?[...selected,b.id]:selected.filter(id=>id!==b.id));setRequestId(crypto.randomUUID());}}/> {b.code} · {formatCurrency(b.total)}</label>)}
        {chosen.flatMap(b=>b.lines.map((line,i)=>{
            const product=raw.products.find(p=>p.warehouseId===warehouse && p.sku===line.sku);
            const warning=!product?'Chưa có sản phẩm tại kho nhận':Number(product.available)===0?'Hết tồn khả dụng':Number(product.available)<Number(product.minStock)?'Tồn khả dụng dưới mức tối thiểu':'';
            return warning?<p key={b.id+i}>{b.code} · {line.sku} · {warning}</p>:null;
        }))}
        <p>Tiền hàng {formatCurrency(total)} · Phí 5% {formatCurrency(fee)} · Tổng {formatCurrency(total+fee)}</p>
        <button className="adm-btn" disabled={!chosen.length || reservations.loading || !!reservations.error} onClick={()=>submit()}>{manager?'Gửi yêu cầu nhập':'Thanh toán và nhập kho'}</button></fieldset>
        {error&&<p role="alert">{error}</p>}
        <table><thead><tr><th>Lô hàng</th><th>Thanh toán từ</th><th>Tiền hàng</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
        <tbody>{orders.data?.map(o=><tr key={o.id}><td>{o.batches.map(b=>b.code).join(', ')}</td><td>{o.warehousePayment?'Ví kho':'Ví công ty'}</td><td>{formatCurrency(o.total)}</td><td>{statuses[o.status]}</td><td>
        {!manager && ['PENDING','PROCESSING'].includes(o.status)&&<button disabled={busy} onClick={()=>submit('/'+o.id+'/approve')}>Duyệt và thanh toán</button>}
        {o.status==='PENDING'&&<button disabled={busy} onClick={()=>submit('/'+o.id+'/cancel')}>{manager?'Hủy':'Từ chối'}</button>}</td></tr>)}</tbody></table></>;
}
