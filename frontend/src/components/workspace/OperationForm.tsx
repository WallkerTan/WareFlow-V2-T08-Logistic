import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { allPages, number, rows as asRows } from '../../services/api';
import type { Row, Service } from '../../services/api';
import { saveResource, useAdminData } from '../../services/data';
import { useWorkspace } from '../../services/workspace';
import { useQuery } from '../../services/query';
import { getAuthSession } from '../../services/authApi';
import { uploadImage } from '../../data/warehouses';
import { formatCurrency } from '../../utils/format';
import { dayKey, sumMoney } from '../../utils/analytics';

type Mode = 'warehouse'|'supplier'|'supplierProduct'|'employee'|'budget'|'po'|'export'|'shipment'|'receipt'|'inventoryProduct'|'transaction';
type Field = {key:string;label:string;type?:string;required?:boolean;options?:{value:string;label:string}[];min?:number};
const options=(items:Row[],label='name')=>items.map(r=>({value:String(r.id),label:String(r[label]||r.id)}));
const models=['FOOD','TECH','APPLIANCE','FASHION','OTHER'].map((value,i)=>({value,label:['Thực phẩm','Công nghệ','Gia dụng','Thời trang','Khác'][i]}));
const generateUUID = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};
const generateBarcode = () => {
    const prefix = '893';
    let code = prefix;
    for (let i = 0; i < 9; i++) {
        code += Math.floor(Math.random() * 10).toString();
    }
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(code[i], 10) * (i % 2 === 0 ? 1 : 3);
    }
    const checksum = (10 - (sum % 10)) % 10;
    return code + checksum.toString();
};
const newLine=()=>({key:generateUUID(),productId:'',lotId:'',qty:'',price:'0',targetProductId:'',lotCode:'',expiryDate:'',condition:'OK'});
export default function OperationForm({back,mode:explicitMode,initial,onSaved}:{back:string;mode?:Mode;initial?:Row;onSaved?:()=>void}) {
    const {pathname}=useLocation();const navigate=useNavigate();const scope=useWorkspace();const session=getAuthSession()!;
    const mode:Mode=explicitMode || (pathname.includes('/suppliers')?'supplier':pathname.includes('/products')?'supplierProduct':pathname.includes('/employees')?'employee':pathname.includes('/budget')?'budget':pathname.includes('/inbound')?'po':pathname.includes('/outbound')||pathname.includes('/transfers')?'export':pathname.includes('/shipments')?'shipment':'warehouse');
    const documentMode=['po','export','receipt'].includes(mode);
    const {raw}=useAdminData(...(documentMode?['products','lots','suppliers','supplierProducts'] as const:['supplierProduct','inventoryProduct'].includes(mode)?['suppliers','supplierProducts','products'] as const:mode==='shipment'?['stockDocuments'] as const:[]));
    const autoBarcode = generateBarcode();
    const [values,setValues]=useState<Record<string,string>>({
        warehouseId:mode==='budget'||mode==='transaction'&&session.role==='COMPANY_ADMIN'?'':scope.warehouseId,
        warehouseType:'RENT',
        businessModel:'OTHER',
        period:dayKey(new Date()).slice(0,7),
        type:mode==='transaction'?'INCOME':pathname.includes('/transfers')?'EXPORT_TRANSFER':'EXPORT_SALE',
        category:mode==='transaction'?'SALE':'OTHER',
        codAmount:'0',
        recipientName:'',
        recipientPhone:'',
        recipientAddress:'',
        barcode: ['inventoryProduct','supplierProduct'].includes(mode) && !initial?.id ? autoBarcode : (initial?.barcode ? String(initial.barcode) : ''),
        ...Object.fromEntries(Object.entries(initial||{}).filter(([,v])=>typeof v==='string'||typeof v==='number'||v===null).map(([k,v])=>[k,v===null?'':String(v)]))
    });
    const warehouseId=values.warehouseId||scope.warehouseId;
    const [lines,setLines]=useState(()=>mode==='receipt'?asRows(initial?.lines).filter(r=>number(r.qty)>number(r.receivedQty)).map(r=>({...newLine(),productId:String(r.productId),qty:String(number(r.qty)-number(r.receivedQty))})):[newLine()]);
    const [pending,setPending]=useState(false);const [error,setError]=useState('');
    const [uploading,setUploading]=useState(false);
    const otherWarehouses=useQuery<Row[]>(mode==='export'?'transfer-warehouses':null,()=>allPages('core','/warehouses/my-company'));
    const targets=useQuery<Row[]>(mode==='export'&&values.type==='EXPORT_TRANSFER'&&warehouseId&&values.targetWarehouseId?`transfer-products:${warehouseId}:${values.targetWarehouseId}`:null,()=>allPages('inventory',`/warehouses/${warehouseId}/transfer-products?targetWarehouseId=${values.targetWarehouseId}`));
    const products=raw.products.filter(r=>r.warehouseId===warehouseId);
    const availableSupplierProducts = raw.supplierProducts.filter(p => !values.supplierId || String(p.supplierId) === String(values.supplierId));
    const field=(key:string,label:string,type='text',required=true):Field=>({key,label,type,required});
    const select=(key:string,label:string,items:{value:string;label:string}[],required=true):Field=>({key,label,options:items,required});
    let fields:Field[]=[];
    if(mode==='warehouse') fields=[field('name','Tên kho'),select('warehouseType','Hình thức',[{value:'RENT',label:'Cho thuê'},{value:'BUY',label:'Mua bán'}]),field('region','Khu vực'),field('address','Địa chỉ'),{...field('area','Diện tích (m²)','number'),min:0.01},{...field('price','Giá (VNĐ)','number'),min:0}];
    if(mode==='supplier') fields=[field('name','Tên nhà cung cấp'),select('businessModel','Lĩnh vực',models),field('phone','Điện thoại','tel',false),field('email','Email','email',false),field('address','Địa chỉ','text',false)];
    if(mode==='supplierProduct') fields=[select('supplierId','Nhà cung cấp',options(raw.suppliers)),field('sku','Mã sản phẩm'),field('name','Tên sản phẩm'),field('unit','Đơn vị tính'),{...field('price','Đơn giá (VNĐ)','number'),min:0},field('barcode','Mã vạch (Tự động tạo)','text',true),field('image','Đường dẫn ảnh','url',false)];
    if(mode==='inventoryProduct') {
        fields = initial?.id ? [
            field('name', 'Tên sản phẩm'),
            field('sku', 'SKU'),
            field('unit', 'Đơn vị tính'),
            { ...field('minStock', 'Tồn tối thiểu', 'number'), min: 0 },
            field('barcode', 'Mã vạch (Tự động tạo)', 'text', true)
        ] : [
            select('warehouseId', 'Kho hàng', options(scope.warehouses)),
            select('supplierId', 'Nhà cung cấp', options(raw.suppliers), false),
            select('supplierProductId', 'Sản phẩm từ nhà cung cấp', availableSupplierProducts.map(p => ({
                value: String(p.id),
                label: `${String(p.name)} (${String(p.sku)}) - Giá: ${Number(p.price || 0).toLocaleString('vi-VN')}₫`
            })), false),
            field('name', 'Tên sản phẩm'),
            field('sku', 'SKU'),
            field('unit', 'Đơn vị tính'),
            { ...field('minStock', 'Tồn tối thiểu', 'number'), min: 0 },
            field('barcode', 'Mã vạch (Tự động tạo)', 'text', true)
        ];
    }
    if(mode==='transaction') fields=[select('warehouseId','Kho',options(scope.warehouses),session.role==='WAREHOUSE_MANAGER'),select('type','Loại giao dịch',(session.role==='WAREHOUSE_MANAGER'?['INCOME']:['INCOME','EXPENSE']).map(value=>({value,label:value==='INCOME'?'Thu':'Chi'}))),select('category','Nhóm giao dịch',['SALE','PURCHASE','TRANSFER','FEE','OTHER'].map((value,i)=>({value,label:['Bán hàng','Mua hàng','Điều chuyển','Phí','Khác'][i]}))),{...field('amount','Số tiền (VNĐ)','number'),min:0.01},field('note','Nội dung','textarea',false)];
    if(mode==='employee') fields=[field('fullName','Họ tên'),field('email','Email','email'),field('password','Mật khẩu cấp ban đầu','password')];
    if(mode==='budget') fields=[select('warehouseId','Kho nhận ngân sách',options(scope.warehouses),false),field('period','Kỳ ngân sách','month'),{...field('allocated','Ngân sách cấp (VNĐ)','number'),min:0.01}];
    if(mode==='shipment') fields=[select('documentId','Phiếu xuất bán đã hoàn tất',raw.stockDocuments.filter(r=>r.warehouseId===warehouseId&&r.type==='EXPORT_SALE'&&r.status==='DONE').map(r=>({value:String(r.id),label:String(r.id)}))),field('carrier','Đơn vị vận chuyển'),field('trackingCode','Mã vận đơn'),{...field('codAmount','Tiền thu hộ COD (VNĐ)','number'),min:0}];
    if(mode==='po') fields=[select('warehouseId','Kho nhận hàng',options(scope.warehouses)),select('supplierId','Nhà cung cấp',options(raw.suppliers)),field('expectedDeliveryDate','Ngày dự kiến nhận','date',false),field('note','Ghi chú','textarea',false)];
    if(mode==='receipt') fields=[field('note','Ghi chú nhận hàng','textarea',false)];
    if(mode==='export') fields=[
        select('warehouseId','Kho xuất',options(scope.warehouses)),
        select('type','Loại phiếu',['EXPORT_SALE','EXPORT_TRANSFER','EXPORT_DESTROY','EXPORT_RETURN'].map((value,i)=>({value,label:['Xuất bán','Điều chuyển','Xuất hủy','Trả nhà cung cấp'][i]}))),
        ...(values.type==='EXPORT_TRANSFER'?[select('targetWarehouseId','Kho nhận',options((otherWarehouses.data||[]).filter(w=>w.id!==warehouseId)))]:[]),
        field('recipientName','Tên người nhận'),
        field('recipientPhone','Số điện thoại người nhận','tel'),
        field('recipientAddress','Địa chỉ người nhận'),
        field('note','Ghi chú thêm','textarea',false)
    ];
    function change(key:string,value:string) {
        if (key === 'supplierId') {
            setValues(v => ({ ...v, supplierId: value, supplierProductId: '' }));
            if (mode === 'po') {
                setLines([newLine()]);
            }
            return;
        }
        if (key === 'supplierProductId') {
            const prod = raw.supplierProducts.find(p => String(p.id) === String(value));
            if (prod) {
                setValues(v => ({
                    ...v,
                    supplierProductId: value,
                    name: String(prod.name || ''),
                    sku: String(prod.sku || ''),
                    unit: String(prod.unit || 'Cái'),
                    minStock: v.minStock || '10',
                    image: String(prod.image || '')
                }));
                return;
            }
        }
        setValues(v=>({...v,[key]:value}));
        if(['warehouseId','targetWarehouseId','type'].includes(key))setLines([newLine()]);
    }
    function changeLine(index:number,key:string,value:string){setLines(list=>list.map((line,i)=>i===index?{...line,[key]:value,...(key==='productId'?{lotId:'',targetProductId:''}:{})}:line));}
    async function save(event:React.FormEvent) {
        event.preventDefault();if(pending||uploading)return;setError('');setPending(true);
        try {
            let service:Service='core';let path='';let body:unknown=values;
            if(mode==='warehouse'){path='/warehouses';body={...values,area:number(values.area),price:number(values.price)};}
            if(mode==='supplier'){path='/suppliers';body={...values,email:values.email||null};}
            if(mode==='supplierProduct'){if(!values.supplierId)throw new Error('Vui lòng chọn nhà cung cấp.');path=`/suppliers/${values.supplierId}/products`;body={...values,price:number(values.price),barcode:values.barcode?.trim()||generateBarcode()};}
            if(mode==='inventoryProduct'){
                if(!warehouseId) throw new Error('Vui lòng chọn kho nhận hàng.');
                if(!values.name?.trim()) throw new Error('Vui lòng nhập tên sản phẩm.');
                if(!values.sku?.trim()) throw new Error('Vui lòng nhập mã SKU.');
                service='inventory';
                path=`/warehouses/${warehouseId}/products${initial?.id?'/'+initial.id:''}`;
                body={
                    sku:values.sku.trim(),
                    name:values.name.trim(),
                    unit:values.unit||'Cái',
                    barcode:values.barcode?.trim()||generateBarcode(),
                    minStock:number(values.minStock),
                    images:values.image?[values.image]:(initial?.images||[])
                };
            }
            if(mode==='employee'){path='/employees';if((values.password||'').length<8)throw new Error('Mật khẩu phải có ít nhất 8 ký tự.');}
            if(mode==='budget'){service='finance';path='/budgets'+(initial?.id?'/'+initial.id:'');body={warehouseId:values.warehouseId||null,period:values.period,allocated:number(values.allocated)};}
            if(mode==='transaction'){
                service='finance';
                path='/transactions';
                const whId = values.warehouseId && values.warehouseId.trim() !== '' ? values.warehouseId.trim() : (session.role==='WAREHOUSE_MANAGER' ? warehouseId : null);
                body={
                    warehouseId: whId || null,
                    type: values.type || 'INCOME',
                    category: values.category || 'SALE',
                    amount: number(values.amount),
                    note: values.note ? values.note.trim() : ''
                };
            }
            if(mode==='shipment'){service='delivery';path=`/warehouses/${warehouseId}/shipments`;body={documentId:values.documentId,carrier:values.carrier,trackingCode:values.trackingCode,codAmount:number(values.codAmount)};}
            if(documentMode){
                if(!warehouseId)throw new Error('Chọn kho trước khi lập phiếu.');
                if(!lines.length||lines.some(l=>!l.productId||!Number.isFinite(Number(l.qty))||Number(l.qty)<=0))throw new Error('Mỗi dòng cần sản phẩm và số lượng lớn hơn 0.');
                if(new Set(lines.map(l=>mode==='export'?l.lotId:l.productId)).size!==lines.length)throw new Error('Không chọn trùng sản phẩm/lô hàng.');
                service='inventory';path=`/warehouses/${warehouseId}/${mode==='po'?'purchase-orders':mode==='receipt'?'receipts':'exports'}`;
                if(mode==='po') {
                    if(!values.supplierId) throw new Error('Vui lòng chọn nhà cung cấp trước khi tạo phiếu nhập hàng.');
                    body={supplierId:values.supplierId,supplierName:raw.suppliers.find(s=>s.id===values.supplierId)?.name,expectedDeliveryDate:values.expectedDeliveryDate||null,note:values.note,submitImmediately:false,lines:lines.map(l=>({productId:l.productId,qty:number(l.qty),price:number(l.price)}))};
                }
                if(mode==='receipt')body={poId:initial?.id,completePo:true,note:values.note,lines:lines.map(l=>({productId:l.productId,receivedQty:number(l.qty),lotCode:l.lotCode,expiryDate:l.expiryDate||null,condition:l.condition}))};
                if(mode==='export') {
                    if(!values.recipientName?.trim()) throw new Error('Vui lòng nhập tên người nhận hàng.');
                    if(!values.recipientPhone?.trim()) throw new Error('Vui lòng nhập số điện thoại người nhận.');
                    const cleanPhone = values.recipientPhone.replace(/[\s.-]/g, '');
                    if(!/^(0\d{9,10}|\+84\d{9,10})$/.test(cleanPhone)) throw new Error('Số điện thoại người nhận không hợp lệ (cần từ 9 - 11 chữ số).');
                    if(!values.recipientAddress?.trim()) throw new Error('Vui lòng nhập địa chỉ người nhận hàng.');
                    
                    const recipientInfo = `Người nhận: ${values.recipientName.trim()} · SĐT: ${cleanPhone} · Đ/C: ${values.recipientAddress.trim()}`;
                    const combinedExportNote = values.note?.trim() ? `${recipientInfo}\n${values.note.trim()}` : recipientInfo;

                    body={
                        type:values.type,
                        targetWarehouseId:values.type==='EXPORT_TRANSFER'?values.targetWarehouseId:null,
                        recipientName:values.recipientName.trim(),
                        recipientPhone:cleanPhone,
                        recipientAddress:values.recipientAddress.trim(),
                        note:combinedExportNote,
                        lines:lines.map(l=>({lotId:l.lotId,quantity:number(l.qty),targetProductId:values.type==='EXPORT_TRANSFER'?l.targetProductId:null}))
                    };
                }
            }
            await saveResource(service,path,['inventoryProduct','budget'].includes(mode)&&initial?.id?'PUT':'POST',body);
            toast.success(mode === 'transaction' ? 'Đã lưu giao dịch thu/chi thành công!' : 'Đã lưu dữ liệu thành công!');
            if(onSaved)onSaved();else navigate(back);
        }catch(e){setError(e instanceof Error?e.message:'Không lưu được dữ liệu.');}finally{setPending(false);}
    }
    return <section className="wf-card"><form onSubmit={save}><fieldset disabled={pending||uploading} style={{border:0,padding:0}}><div className="wf-fields">{fields.map(f=><label className="wf-field" key={f.key}><span>{f.label}{f.required?' *':''}</span>{f.options?<select value={values[f.key]||(f.key==='warehouseId'&&f.required?warehouseId:'')} required={f.required} onChange={e=>change(f.key,e.target.value)}><option value="">{f.required?'Chọn…':'Toàn công ty'}</option>{f.options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>:f.type==='textarea'?<textarea value={values[f.key]||''} onChange={e=>change(f.key,e.target.value)} maxLength={1000}/>:f.key==='barcode'?<div style={{display:'flex',gap:8,alignItems:'center'}}><input type="text" required={f.required} value={values[f.key]||''} maxLength={64} onChange={e=>change(f.key,e.target.value)} placeholder="Mã vạch tự động" style={{flex:1}}/><button type="button" className="adm-btn" style={{whiteSpace:'nowrap',padding:'6px 12px',fontSize:13}} onClick={()=>change('barcode',generateBarcode())} title="Tạo mã vạch ngẫu nhiên mới">Tạo lại mã</button></div>:<input type={f.type||'text'} required={f.required} value={values[f.key]||''} min={f.min} step={f.type==='number'?'0.01':undefined} maxLength={f.type==='password'?128:255} onChange={e=>change(f.key,e.target.value)}/>}</label>)}</div>
        {mode==='supplierProduct'&&<label className="wf-field"><span>Tải ảnh sản phẩm</span><input type="file" accept="image/*" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;setUploading(true);try{const result=await uploadImage(file,'products');change('image',result.secureUrl);}catch(error){setError(error instanceof Error?error.message:'Không tải được ảnh.');}finally{setUploading(false);}}}/></label>}
        {documentMode&&<>
            {mode==='po'&&!values.supplierId&&(
                <div style={{padding:'12px 16px',background:'#eff6ff',color:'#1e40af',border:'1px solid #bfdbfe',borderRadius:8,fontSize:13,fontWeight:500,margin:'16px 0 8px',display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:16}}>⚠️</span>
                    <span>Vui lòng chọn <strong>Nhà cung cấp</strong> ở thông tin bên trên để bắt đầu chọn sản phẩm nhập hàng.</span>
                </div>
            )}
            {lines.map((line,i)=><section className="wf-card" key={line.key} style={{marginTop:16}}><h3>Dòng hàng {i+1}</h3><div className="wf-fields">
                <label className="wf-field"><span>Sản phẩm *</span><select required disabled={mode==='receipt'||(mode==='po'&&!values.supplierId)} value={line.productId} onChange={e=>{
                    const pId=e.target.value;
                    changeLine(i,'productId',pId);
                    if(mode==='po'&&pId){
                        const chosen=products.find(p=>String(p.id)===String(pId));
                        const spMatch=raw.supplierProducts.filter(sp=>String(sp.supplierId)===String(values.supplierId)).find(sp=>chosen&&(String(sp.sku).toLowerCase()===String(chosen.sku).toLowerCase()||String(sp.name).toLowerCase()===String(chosen.name).toLowerCase()));
                        if(spMatch&&Number(spMatch.price)>0){changeLine(i,'price',String(spMatch.price));}
                        else if(chosen&&Number(chosen.price)>0){changeLine(i,'price',String(chosen.price));}
                    }
                }}>
                    <option value="">{mode==='po'&&!values.supplierId?'-- Vui lòng chọn nhà cung cấp trước --':'Chọn sản phẩm'}</option>
                    {mode==='po'&&values.supplierId?(()=>{
                        const supplierItems=raw.supplierProducts.filter(sp=>String(sp.supplierId)===String(values.supplierId));
                        const matched=products.filter(p=>supplierItems.some(sp=>String(sp.sku).toLowerCase()===String(p.sku).toLowerCase()||String(sp.name).toLowerCase()===String(p.name).toLowerCase()));
                        const others=products.filter(p=>!matched.some(m=>m.id===p.id));
                        return <>
                            {matched.length>0&&<optgroup label={`Sản phẩm từ nhà cung cấp (${matched.length})`}>{matched.map(p=>{
                                const sp=supplierItems.find(s=>String(s.sku).toLowerCase()===String(p.sku).toLowerCase()||String(s.name).toLowerCase()===String(p.name).toLowerCase());
                                return <option key={String(p.id)} value={String(p.id)}>{String(p.sku)} · {String(p.name)} {sp?.price?`— ${Number(sp.price).toLocaleString('vi-VN')}₫`:''}</option>;
                            })}</optgroup>}
                            <optgroup label="Tất cả sản phẩm trong kho">{(matched.length>0?others:products).map(p=><option key={String(p.id)} value={String(p.id)}>{String(p.sku)} · {String(p.name)}</option>)}</optgroup>
                        </>;
                    })():products.map(p=><option key={String(p.id)} value={String(p.id)}>{String(p.sku)} · {String(p.name)}</option>)}
                </select></label>
                {mode==='export'&&<label className="wf-field"><span>Lô xuất *</span><select required value={line.lotId} onChange={e=>changeLine(i,'lotId',e.target.value)}><option value="">Chọn lô</option>{raw.lots.filter(l=>l.productId===line.productId&&l.warehouseId===warehouseId).map(l=><option key={String(l.id)} value={String(l.id)}>{String(l.lotCode)} · Khả dụng {String(l.available??Math.max(0,number(l.quantity)-number(l.reserved)))}</option>)}</select></label>}
                {mode==='export'&&values.type==='EXPORT_TRANSFER'&&<label className="wf-field"><span>Sản phẩm tương ứng ở kho nhận *</span><select required value={line.targetProductId} onChange={e=>changeLine(i,'targetProductId',e.target.value)}><option value="">Chọn SKU kho nhận</option>{(targets.data||[]).map(p=><option key={String(p.id)} value={String(p.id)}>{String(p.sku)} · {String(p.name)}</option>)}</select></label>}
                <label className="wf-field"><span>Số lượng *</span><input required type="number" min="0.01" step="0.01" value={line.qty} onChange={e=>changeLine(i,'qty',e.target.value)}/></label>{mode==='po'&&<label className="wf-field"><span>Đơn giá (VNĐ) *</span><input required type="number" min="0" step="0.01" value={line.price} onChange={e=>changeLine(i,'price',e.target.value)}/></label>}
                {mode==='receipt'&&<><label className="wf-field"><span>Mã lô nhận *</span><input required value={line.lotCode} onChange={e=>changeLine(i,'lotCode',e.target.value)}/></label><label className="wf-field"><span>Hạn sử dụng</span><input type="date" value={line.expiryDate} onChange={e=>changeLine(i,'expiryDate',e.target.value)}/></label><label className="wf-field"><span>Tình trạng</span><select value={line.condition} onChange={e=>changeLine(i,'condition',e.target.value)}><option value="OK">Bình thường</option><option value="DAMAGED">Hư hỏng</option></select></label></>}
            </div><button type="button" className="adm-btn" disabled={lines.length===1} onClick={()=>setLines(lines.filter((_,idx)=>i!==idx))}>Bỏ dòng</button></section>)}{mode!=='receipt'&&<button className="adm-btn" type="button" disabled={mode==='po'&&!values.supplierId} onClick={()=>setLines([...lines,newLine()])}>Thêm dòng hàng</button>}{mode==='po'&&<p>Tổng tiền dự kiến: <strong>{lines.every(l=>Number.isSafeInteger(Math.round(number(l.qty)*number(l.price)*100))&&number(l.qty)*number(l.price)<Number.MAX_SAFE_INTEGER/100/lines.length)?formatCurrency(sumMoney(lines.map(l=>number(l.qty)*number(l.price)))):'Số tiền vượt phạm vi tính toán'}</strong></p>}</>}
        {targets.error&&<p role="alert">{targets.error}</p>}{error&&<div className="wf-notice" role="alert">{error}</div>}<div className="wf-form-actions"><Link className="adm-btn" to={back}>Quay lại</Link><button className="adm-btn adm-btn-primary" type="submit" disabled={pending||uploading||(session.role==='WAREHOUSE_MANAGER'&&!warehouseId)}>{pending?'Đang lưu…':uploading?'Đang tải ảnh…':'Lưu'}</button></div></fieldset></form></section>;
}
