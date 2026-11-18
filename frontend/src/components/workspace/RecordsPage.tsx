import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { DataPage } from './WorkspacePages';
import { Modal } from '../admin/AdminUI';
import { saveResource, useAdminData } from '../../services/data';
import { getAuthSession } from '../../services/authApi';
import { number, object, rows, text } from '../../services/api';
import type { Row, Service } from '../../services/api';
import { formatCurrency, formatDateTime } from '../../utils/format';
import OperationForm from './OperationForm';

type Mode='inbound'|'outbound'|'transfers'|'history'|'employees'|'shipments'|'approvals';
const labels:Record<string,string>={DRAFT:'Nháp',PENDING_APPROVAL:'Chờ duyệt',APPROVED:'Đã duyệt',DONE:'Hoàn tất',CANCELLED:'Đã hủy',CREATED:'Mới tạo',IN_TRANSIT:'Đang giao',DELIVERED:'Đã giao',FAILED:'Giao thất bại',RETURNED:'Đã trả',ACTIVE:'Hoạt động',LOCKED:'Khóa',PO:'Đơn mua hàng',RECEIPT:'Phiếu nhập',EXPORT_SALE:'Xuất bán',EXPORT_TRANSFER:'Điều chuyển',EXPORT_DESTROY:'Xuất hủy',EXPORT_RETURN:'Trả nhà cung cấp'};
export default function RecordsPage({mode,embedded=false}:{mode:Mode;embedded?:boolean}) {
    const {pathname}=useLocation();const session=getAuthSession()!;
    const data=useAdminData(mode==='employees'?'users':mode==='history'?'movements':mode==='shipments'?'shipments':'stockDocuments');
    const [decision,setDecision]=useState<{row:Row;action:string;label:string}|null>(null);const [note,setNote]=useState('');const [name,setName]=useState('');const [status,setStatus]=useState('ACTIVE');const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [receipt,setReceipt]=useState<Row|null>(null);
    const title={inbound:'Nhập hàng hóa',outbound:'Xuất hàng hóa',transfers:'Điều chuyển hàng hóa',history:'Lịch sử nhập xuất',employees:'Quản lý nhân viên',shipments:'Giao hàng & vận đơn',approvals:'Phiếu kho chờ phê duyệt'}[mode];
    let columns:string[];let records:Row[];let table:string[][];
    if(mode==='employees'){records=data.raw.users;columns=['Mã nhân viên','Họ tên','Email','Kho phụ trách','Vai trò','Trạng thái'];table=records.map(r=>[text(r.id),text(r.fullName),text(r.email),data.raw.warehouses.filter(w=>object(w.handover).managerId===r.id).map(w=>text(w.name)).join(', ')||'—','Quản lý kho',labels[String(r.status)]||text(r.status)]);}
    else if(mode==='history'){records=data.raw.movements;columns=['Mã biến động','Sản phẩm / lô','Loại phiếu','Số lượng thay đổi','Ngày tạo','Ghi chú'];table=records.map(r=>[text(r.id),`${text(r.sku)} / ${text(r.lotCode)}`,labels[String(r.documentType)]||text(r.documentType),text(r.qtyChange),formatDateTime(String(r.createdAt)),text(r.note)]);}
    else if(mode==='shipments'){records=data.raw.shipments;columns=['Mã vận đơn','Đơn vị vận chuyển','Kho','Tiền COD','Ngày tạo','Trạng thái'];table=records.map(r=>[text(r.id),`${text(r.trackingCode)} · ${text(r.carrier)}`,text(r.warehouseName),formatCurrency(number(r.codAmount)),formatDateTime(String(r.createdAt)),labels[String(r.status)]||text(r.status)]);}
    else {records=data.raw.stockDocuments.filter(r=>mode==='approvals'?r.status==='PENDING_APPROVAL':mode==='transfers'?r.type==='EXPORT_TRANSFER':mode==='inbound'?['PO','RECEIPT'].includes(String(r.type)):String(r.type).startsWith('EXPORT_'));columns=['Mã phiếu','Loại phiếu','Kho','Số dòng hàng','Ngày tạo','Trạng thái'];table=records.map(r=>[text(r.id),labels[String(r.type)]||text(r.type),text(r.warehouseName),String(rows(r.lines).length),formatDateTime(String(r.createdAt)),labels[String(r.status)]||text(r.status)]);}
    function choose(row:Row,action:string,label:string){setDecision({row,action,label});setNote('');setName(String(row.fullName||''));setStatus(String(row.status||'ACTIVE'));setPassword('');setError('');}
    async function confirm(e:React.FormEvent){e.preventDefault();if(!decision||busy)return;setBusy(true);setError('');try{
        const r=decision.row;const op=decision.action;let service:Service='inventory';let path='';let method='POST';let body:unknown={note};
        if(mode==='employees'){
            if(password.trim() && password.trim().length < 8) throw new Error('Mật khẩu mới phải có ít nhất 8 ký tự.');
            service='core';path='/employees/'+r.id;method='PATCH';body={fullName:name,status,...(password.trim()?{password:password.trim()}:{})};
        }
        else if(mode==='shipments'){service='delivery';path=`/warehouses/${r.warehouseId}/shipments/${r.id}/${op==='collect'?'cod/collect':'status'}`;method=op==='collect'?'POST':'PATCH';body=op==='collect'?undefined:{status:op,note};}
        else{const collection=r.type==='PO'?'purchase-orders':r.type==='RECEIPT'?'receipts':'exports';path=`/warehouses/${r.warehouseId}/${collection}/${r.id}/${op}`;}
        await saveResource(service,path,method,body);setDecision(null);
    }catch(e){setError(e instanceof Error?e.message:'Không lưu được thao tác.');}finally{setBusy(false);}}
    function actions(id:string){const r=records.find(r=>String(r.id)===id);if(!r||session.role==='SYSTEM_ADMIN'||mode==='history')return null;
        const button=(action:string,label:string)=><button key={action} className="adm-btn" onClick={()=>choose(r,action,label)}>{label}</button>;
        if(mode==='employees')return button('edit','Cập nhật nhân viên');
        if(mode==='shipments'){const next:Record<string,string[]>={CREATED:['IN_TRANSIT'],IN_TRANSIT:['DELIVERED','FAILED'],FAILED:['IN_TRANSIT','RETURNED']};return <>{(next[String(r.status)]||[]).map(op=>button(op,labels[op]))}{r.status==='DELIVERED'&&r.codStatus==='PENDING'&&button('collect','Xác nhận nhận đủ COD')}</>;}
        const approval=object(r.approval);const reviewer=session.role==='COMPANY_ADMIN';
        return <>{r.status==='DRAFT'&&button('submit','Gửi duyệt')}{r.status==='PENDING_APPROVAL'&&reviewer&&<>{button('approve','Duyệt')}{button('reject','Từ chối')}</>}{['DRAFT','PENDING_APPROVAL','APPROVED'].includes(String(r.status))&&r.type!=='RECEIPT'&&button('cancel','Hủy phiếu')}{r.status==='APPROVED'&&r.type==='PO'&&<button className="adm-btn" onClick={()=>setReceipt(r)}>Nhận hàng</button>}{r.status==='APPROVED'&&String(r.type).startsWith('EXPORT_')&&<>{r.type==='EXPORT_SALE'&&!approval.pickAt?button('pick','Xác nhận lấy hàng'):r.type==='EXPORT_SALE'&&!approval.packAt?button('pack','Xác nhận đóng gói'):button('complete','Hoàn tất xuất kho')}</>}</>;
    }
    return <><DataPage title={title} embedded={embedded} columns={columns} rows={table} action={session.role!=='SYSTEM_ADMIN'&&!embedded&&!['history','approvals'].includes(mode)?{to:pathname+'/new',label:mode==='employees'?'Thêm nhân viên':mode==='shipments'?'Tạo vận đơn':mode==='transfers'?'Tạo điều chuyển':mode==='inbound'?'Tạo phiếu nhập':'Tạo phiếu xuất'}:undefined} actions={actions} details={id=>{const r=records.find(r=>String(r.id)===id);return r&&Array.isArray(r.lines)?<div className="workspace-table"><table><thead><tr><th>Sản phẩm / lô</th><th>Số lượng</th><th>Đơn giá</th></tr></thead><tbody>{rows(r.lines).map((line,i)=><tr key={i}><td>{text(line.sku||line.lotCode||line.productId||line.lotId)}</td><td>{text(line.qty??line.quantity??line.receivedQty)}</td><td>{line.price==null?'—':formatCurrency(number(line.price))}</td></tr>)}</tbody></table></div>:null;}}/>
    {decision&&<Modal title={decision.label} onClose={()=>{if(!busy)setDecision(null);}}><form onSubmit={confirm}><fieldset disabled={busy} style={{border:0,padding:0}}>{mode==='employees'?<div className="wf-fields"><label className="wf-field"><span>Họ tên *</span><input required value={name} onChange={e=>setName(e.target.value)}/></label><label className="wf-field"><span>Trạng thái</span><select value={status} onChange={e=>setStatus(e.target.value)}><option value="ACTIVE">Hoạt động</option><option value="LOCKED">Khóa</option></select></label><label className="wf-field"><span>Mật khẩu mới</span><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Để trống nếu giữ nguyên mật khẩu cũ" minLength={8} maxLength={128} />{password && password.length < 8 && <small style={{color:'#d9383a',marginTop:4,display:'block'}}>Mật khẩu phải từ 8 ký tự trở lên</small>}</label></div>:<label className="wf-field"><span>{decision.action==='collect'?`Chỉ xác nhận khi đã nhận đủ ${formatCurrency(number(decision.row.codAmount))}.`:'Ghi chú / lý do'}</span><textarea required={decision.action==='reject'||decision.action==='cancel'} value={note} onChange={e=>setNote(e.target.value)} maxLength={1000}/></label>}{error&&<p role="alert">{error}</p>}<button className="adm-btn adm-btn-primary" type="submit">{busy?'Đang lưu…':'Xác nhận'}</button></fieldset></form></Modal>}
    {receipt&&<Modal title="Nhận hàng theo đơn mua" onClose={()=>setReceipt(null)}><OperationForm mode="receipt" initial={{...receipt,warehouseId:String(receipt.warehouseId)}} back={pathname} onSaved={()=>setReceipt(null)}/></Modal>}</>;
}
