import { useState } from 'react';
import { getAuthSession } from '../../services/authApi';
import { request, money, number } from '../../services/api';
import type { Row } from '../../services/api';
import { useQuery, invalidateData } from '../../services/query';
import { useWorkspace } from '../../services/workspace';
import { useAdminData, saveResource } from '../../services/data';

export default function WalletPanel() {
    const session=getAuthSession()!;const admin=session.role==='SYSTEM_ADMIN',manager=session.role==='WAREHOUSE_MANAGER';
    const scope=useWorkspace();const {raw}=useAdminData();
    const [target,setTarget]=useState('');const [amount,setAmount]=useState('');const [note,setNote]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
    const [id,setId]=useState(()=>crypto.randomUUID());
    const query=useQuery<Row>(manager&&!scope.warehouseId?null:`wallet-panel:${session.companyId}:${scope.warehouseId}:${admin}`,()=>request('finance',admin?'/wallet/platform':`/wallet${manager?`?warehouseId=${scope.warehouseId}`:''}`));
    const targetBalance=useQuery<Row>(target?`wallet-target:${target}:${admin}`:null,()=>request('finance',`/wallet?${admin?'companyId':'warehouseId'}=${target}`));
    async function submit(e:React.FormEvent) {e.preventDefault();if(busy)return;setBusy(true);setError('');try{await saveResource('finance',admin?'/wallet/fund':'/wallet/allocate','POST',{id,companyId:admin?target:session.companyId,warehouseId:admin?null:target,amount:number(amount),note});setId(crypto.randomUUID());setAmount('');}catch(e){setError(e instanceof Error?e.message:'Không thực hiện được giao dịch');}finally{setBusy(false);invalidateData();}}
    return <section className="wf-card"><h3>{admin?'Tài khoản phí dịch vụ WareFlow':manager?'Tài khoản kho':'Tài khoản công ty'}</h3>{query.data&&<p>Số dư: <strong>{money(query.data.balance)}</strong></p>}{(error||query.error||targetBalance.error)&&<p role="alert">{error||query.error||targetBalance.error}</p>}{!manager&&<form onSubmit={submit}><fieldset disabled={busy} style={{border:0,padding:0}}><div className="wf-fields"><label className="wf-field"><span>{admin?'Công ty nhận tiền':'Kho nhận ngân sách'}</span><select required value={target} onChange={e=>{setTarget(e.target.value);setId(crypto.randomUUID());}}><option value="">Chọn…</option>{(admin?raw.companies:scope.warehouses).map(r=><option key={String(r.id)} value={String(r.id)}>{String(r.name)}</option>)}</select></label><label className="wf-field"><span>Số tiền (VNĐ)</span><input required type="number" min="0.01" step="0.01" value={amount} onChange={e=>{setAmount(e.target.value);setId(crypto.randomUUID());}}/></label><label className="wf-field"><span>Nội dung</span><input required value={note} maxLength={1000} onChange={e=>setNote(e.target.value)}/></label></div>{targetBalance.data&&<p>Số dư bên nhận: {money(targetBalance.data.balance)}</p>}<p>Phí dịch vụ 5%: {money(number(amount)*.05)} · {admin?'Công ty thực nhận':'Tổng trừ từ công ty'}: {money(number(amount)*(admin?.95:1.05))}</p><button className="adm-btn adm-btn-primary" disabled={busy}>{busy?'Đang xử lý…':admin?'Ghi nhận tiền vào công ty':'Cấp ngân sách cho kho'}</button></fieldset></form>}</section>;
}
