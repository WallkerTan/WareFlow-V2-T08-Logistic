import { useState } from 'react';
import { query, request } from '../../services/api';
import { saveResource,useAdminData } from '../../services/data';
import { getAuthSession } from '../../services/authApi';
import { useQuery } from '../../services/query';
import { useWorkspace } from '../../services/workspace';
import { formatCurrency, randomUUID } from '../../utils/format';
export default function WalletPanel(){
    const session=getAuthSession()!;
    const admin=session.role==='SYSTEM_ADMIN';
    const manager=session.role==='WAREHOUSE_MANAGER';
    const {companies}=useAdminData();
    const scope=useWorkspace();
    const [company,setCompany]=useState('');
    const owner=admin?company:session.companyId||'';
    const [destination,setDestination]=useState('');
    const [amount,setAmount]=useState('');
    const [requestId,setRequestId]=useState(()=>randomUUID());
    const [busy,setBusy]=useState(false);
    const [error,setError]=useState('');
    const [notice,setNotice]=useState('');
    const keys=query({companyId:admin?company:undefined,warehouseId:manager?scope.warehouseId:admin?destination:undefined});
    const balance=useQuery(manager&&!scope.warehouseId?null:'wallet'+keys,()=>request<{balance:number}>('finance','/wallets'+keys));
    const warehouses=scope.warehouses.filter(w=>w.ownerCompanyId===owner);
    async function submit(e:React.FormEvent){
        e.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');
        try{await saveResource('finance',admin?'/wallets/opening':'/wallets/allocate','POST',
            {requestId,companyId:owner,warehouseId:destination||null,amount:Number(amount)});
            setAmount('');setRequestId(randomUUID());setNotice('Đã ghi nhận giao dịch ví.');
        }catch(e){setError(e instanceof Error?e.message:'Không thể ghi giao dịch.');}finally{setBusy(false);}
    }
    return <section className="wf-card"><h3>{admin&&!company?'Ví phí WareFlow':manager||admin&&destination?'Ví kho':'Ví công ty'}</h3>
        {balance.data&&<p>Số dư khả dụng {formatCurrency(balance.data.balance)}</p>}
        {!manager&&<form onSubmit={submit}><fieldset disabled={busy}>
        {admin&&<label>Công ty <select required value={company} onChange={e=>{setCompany(e.target.value);setDestination('');setRequestId(randomUUID());}}><option value="">Chọn công ty</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
        <label>Kho <select required={!admin} value={destination} onChange={e=>{setDestination(e.target.value);setRequestId(randomUUID());}}><option value="">{admin?'Ví công ty':'Chọn kho nhận'}</option>{warehouses.map(w=><option key={String(w.id)} value={String(w.id)}>{String(w.name)}</option>)}</select></label>
        <label>Số tiền <input type="number" required min=".01" step=".01" value={amount} onChange={e=>{setAmount(e.target.value);setRequestId(randomUUID());}}/></label>
        {!admin&&<p>Phí {formatCurrency(Math.round(Number(amount)*5)/100)} · Kho nhận {formatCurrency(Number(amount))}</p>}
        <button type="submit" className="adm-btn">{admin?'Ghi số dư đầu kỳ':'Cấp tiền cho kho'}</button></fieldset></form>}
        {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}</section>;
}
