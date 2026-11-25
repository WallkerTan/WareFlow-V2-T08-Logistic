import { useState } from 'react';
import { useReduxFormState } from '../../store/useReduxFormState';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../admin/AdminUI';
import { request, type Row } from '../../services/api';
import { useQuery } from '../../services/query';
import { useAdminData, saveResource } from '../../services/data';
import { usePurchaseBatchCatalog } from '../../services/purchaseBatchCatalog';
import { useWorkspace } from '../../services/workspace';
import { formatCurrency } from '../../utils/format';

type BatchLine = {supplierName:string; sku:string; name:string; quantity:number; price:number; amount:number};
type Batch = {id:string; code:string; total:number; lines:BatchLine[]};
const newLine = () => ({supplierId:'',productId:'',quantity:'1'});

export default function PurchaseBatches() {
    const {raw}=useAdminData('products');
    const catalog=usePurchaseBatchCatalog();
    const suppliers=catalog.data?.suppliers ?? [];
    const supplierProducts=catalog.data?.products ?? [];
    const {warehouseId}=useWorkspace();
    const batches=useQuery('purchase-batches',()=>request<Batch[]>('core','/purchase-batches'));
    const [lines,setLines]=useReduxFormState([newLine()]);
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
            toast.success('Đã tạo lô hàng.');
        } catch(e){setError(e instanceof Error?e.message:'Không tạo được lô hàng.');}
        finally{setBusy(false);}
    }
    function warning(product:Row|undefined) {
        if(!warehouseId || !product)return '';
        const stock=raw.products.find(p=>p.warehouseId===warehouseId && (p.sku===product.sku || p.sku===product.legacySku));
        if(!stock)return 'Chưa nhập sản phẩm tại kho này.';
        return Number(stock.available)<Number(stock.minStock)?'Tồn khả dụng dưới mức tối thiểu.':'';
    }
    const close = () => { if (!busy) { setCreating(false); setError(''); setLines([newLine()]); } };
    return <section className="wf-operation-stack">
        <div className="wf-operation-actions">
            <button type="button" className="adm-btn adm-btn-primary" onClick={() => setCreating(true)}>
                <Plus size={16} /> Thêm lô hàng mới
            </button>
        </div>
        {creating && <Modal title="Tạo lô hàng" onClose={close} wide>
            <form onSubmit={submit}><fieldset disabled={busy} className="wf-form-stack">
            {catalog.loading && <p role="status">Đang tải danh mục nhà cung cấp…</p>}
            {catalog.error && <p role="alert">{catalog.error} <button type="button" className="adm-btn" onClick={catalog.reload}>Thử lại</button></p>}
            {lines.map((line,i)=>{
                const product=supplierProducts.find(p=>p.id===line.productId);
                return <section key={i} className="wf-line-card wf-fields">
                    <h4 className="wf-field-wide">Dòng hàng {i + 1}</h4>
                    <label className="wf-field"><span>Nhà cung cấp</span><select required value={line.supplierId} onChange={e=>change(i,'supplierId',e.target.value)}><option value="">Chọn nhà cung cấp</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
                    <label className="wf-field"><span>Sản phẩm</span><select required value={line.productId} onChange={e=>change(i,'productId',e.target.value)}><option value="">Chọn SKU</option>{supplierProducts.filter(p=>p.supplierId===line.supplierId).map(p=><option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}</select></label>
                    <label className="wf-field"><span>Số lượng</span><input type="number" required min=".01" step=".01" value={line.quantity} onChange={e=>change(i,'quantity',e.target.value)}/></label>
                    <div className="wf-field">
                        <span>Thành tiền</span>
                        <strong>{formatCurrency(Number(product?.price || 0) * Number(line.quantity))}</strong>
                        {warning(product) && <small>{warning(product)}</small>}
                    </div>
                    <button type="button" className="adm-btn" disabled={lines.length===1} onClick={()=>setLines(lines.filter((_,n)=>i!==n))}>Bỏ dòng</button>
                </section>;
            })}
            <p>Tổng tiền {formatCurrency(lines.reduce((sum,line)=>sum+Number(supplierProducts.find(p=>p.id===line.productId)?.price||0)*Number(line.quantity),0))}</p>
            <div className="wf-operation-actions">
                <button type="button" className="adm-btn" disabled={lines.length >= 100} onClick={() => setLines([...lines, newLine()])}>Thêm dòng hàng</button>
                <button type="button" className="adm-btn" onClick={close}>Hủy</button>
                <button type="submit" className="adm-btn adm-btn-primary">{busy ? 'Đang tạo…' : 'Tạo lô hàng'}</button>
            </div>
            {error && <p className="wf-notice" role="alert">{error}</p>}
        </fieldset></form></Modal>}
        {batches.loading && <p role="status">Đang tải danh sách lô mua…</p>}
        {batches.error && <div role="alert">
            <p>Không tải được danh sách lô mua. {batches.error}</p>
            <button type="button" onClick={batches.reload}>Thử lại</button>
        </div>}
        {!batches.loading && !batches.error && batches.data?.length === 0 &&
            <p>Chưa có lô mua. Chọn “Thêm lô hàng mới” để tạo lô đầu tiên.</p>}
        {batches.data?.map(batch=><section className="wf-card wf-operation-stack" key={batch.id}><h3>{batch.code}</h3>
            <div className="workspace-table"><table><thead><tr>{['Dòng','Nhà cung cấp','SKU','Tên mặt hàng','Số lượng','Đơn giá niêm yết','Thành tiền'].map(h=><th key={h}>{h}</th>)}</tr></thead>
            <tbody>{batch.lines.map((l,i)=><tr key={i}><td>{i+1}</td><td>{l.supplierName}</td><td>{l.sku}</td><td>{l.name}</td><td>{l.quantity}</td><td>{formatCurrency(l.price)}</td><td>{formatCurrency(l.amount)}</td></tr>)}</tbody></table></div>
            <p>Tổng tiền {formatCurrency(batch.total)}</p></section>)}
    </section>;
}
