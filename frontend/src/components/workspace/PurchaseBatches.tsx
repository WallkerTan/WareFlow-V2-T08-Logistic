import { useState } from 'react';
import { request, type Row } from '../../services/api';
import { useQuery } from '../../services/query';
import { useAdminData, saveResource } from '../../services/data';
import { useWorkspace } from '../../services/workspace';
import { formatCurrency } from '../../utils/format';

type BatchLine = {supplierName:string; sku:string; name:string; quantity:number; price:number; amount:number};
type Batch = {id:string; code:string; total:number; lines:BatchLine[]};
const newLine = () => ({supplierId:'',productId:'',quantity:'1'});

export default function PurchaseBatches() {
    const {raw}=useAdminData('suppliers','supplierProducts','products');
    const {warehouseId}=useWorkspace();
    const batches=useQuery('purchase-batches',()=>request<Batch[]>('core','/purchase-batches'));
    const [lines,setLines]=useState([newLine()]);
    const [creating,setCreating]=useState(false);
    const [busy,setBusy]=useState(false);
    const [error,setError]=useState('');
    function change(index:number, field:keyof ReturnType<typeof newLine>, value:string) {
        setLines(current=>current.map((line,i)=>i===index ? {...line,[field]:value,...(field==='supplierId'?{productId:''}:{})} : line));
    }
    async function submit(e:React.FormEvent) {
        e.preventDefault();
        if(busy)return;
        setBusy(true);setError('');
        try {
            await saveResource('core','/purchase-batches','POST',{lines:lines.map(l=>({...l,quantity:Number(l.quantity)}))});
            setLines([newLine()]);setCreating(false);
        } catch(e){setError(e instanceof Error?e.message:'Không tạo được lô hàng.');}
        finally{setBusy(false);}
    }
    function warning(product:Row|undefined) {
        if(!warehouseId || !product)return '';
        const stock=raw.products.find(p=>p.warehouseId===warehouseId && (p.sku===product.sku || p.sku===product.legacySku));
        if(!stock)return 'Chưa nhập sản phẩm tại kho này.';
        return Number(stock.available)<Number(stock.minStock)?'Tồn khả dụng dưới mức tối thiểu.':'';
    }
    return <section><button className="adm-btn" onClick={()=>setCreating(true)}>Thêm lô hàng mới</button>
        {creating && <form onSubmit={submit} className="wf-card"><fieldset disabled={busy}>
            {lines.map((line,i)=>{
                const product=raw.supplierProducts.find(p=>p.id===line.productId);
                return <section key={i} className="wf-fields">
                    <label>Nhà cung cấp<select required value={line.supplierId} onChange={e=>change(i,'supplierId',e.target.value)}><option value="">Chọn nhà cung cấp</option>{raw.suppliers.map(s=><option key={String(s.id)} value={String(s.id)}>{String(s.name)}</option>)}</select></label>
                    <label>Sản phẩm<select required value={line.productId} onChange={e=>change(i,'productId',e.target.value)}><option value="">Chọn SKU</option>{raw.supplierProducts.filter(p=>p.supplierId===line.supplierId).map(p=><option key={String(p.id)} value={String(p.id)}>{String(p.sku)} · {String(p.name)}</option>)}</select></label>
                    <label>Số lượng<input type="number" required min=".01" step=".01" value={line.quantity} onChange={e=>change(i,'quantity',e.target.value)}/></label>
                    <p>{warning(product)} {formatCurrency(Number(product?.price||0)*Number(line.quantity))}</p>
                    <button type="button" disabled={lines.length===1} onClick={()=>setLines(lines.filter((_,n)=>i!==n))}>Bỏ dòng</button>
                </section>;
            })}
            <p>Tổng tiền {formatCurrency(lines.reduce((sum,line)=>sum+Number(raw.supplierProducts.find(p=>p.id===line.productId)?.price||0)*Number(line.quantity),0))}</p>
            <button type="button" onClick={()=>setLines([...lines,newLine()])}>Thêm dòng hàng</button>
            <button type="submit">Tạo lô hàng</button><button type="button" onClick={()=>setCreating(false)}>Đóng</button>
            {error&&<p role="alert">{error}</p>}
        </fieldset></form>}
        {batches.loading && <p role="status">Đang tải danh sách lô mua…</p>}
        {batches.error && <div role="alert">
            <p>Không tải được danh sách lô mua. {batches.error}</p>
            <button type="button" onClick={batches.reload}>Thử lại</button>
        </div>}
        {!batches.loading && !batches.error && batches.data?.length === 0 &&
            <p>Chưa có lô mua. Chọn “Thêm lô hàng mới” để tạo lô đầu tiên.</p>}
        {batches.data?.map(batch=><section className="wf-card" key={batch.id}><h3>{batch.code}</h3>
            <table><thead><tr>{['Dòng','Nhà cung cấp','SKU','Tên mặt hàng','Số lượng','Đơn giá niêm yết','Thành tiền'].map(h=><th key={h}>{h}</th>)}</tr></thead>
            <tbody>{batch.lines.map((l,i)=><tr key={i}><td>{i+1}</td><td>{l.supplierName}</td><td>{l.sku}</td><td>{l.name}</td><td>{l.quantity}</td><td>{formatCurrency(l.price)}</td><td>{formatCurrency(l.amount)}</td></tr>)}</tbody></table>
            <p>Tổng tiền {formatCurrency(batch.total)}</p></section>)}
    </section>;
}
