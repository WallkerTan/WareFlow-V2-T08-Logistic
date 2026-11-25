import { useState } from 'react';
import { useReduxFormState } from '../../store/useReduxFormState';
import { Modal } from '../admin/AdminUI';
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
    const [company,setCompany]=useReduxFormState('');
    const owner=admin?company:session.companyId||'';
    const [destination,setDestination]=useReduxFormState('');
    const [amount,setAmount]=useReduxFormState('');
    const [requestId,setRequestId]=useReduxFormState(()=>randomUUID());
    const [open,setOpen]=useState(false);
    const [busy,setBusy]=useState(false);
    const [error,setError]=useState('');
    const [notice,setNotice]=useState('');
    const keys=query({companyId:admin?company:undefined,warehouseId:manager?scope.warehouseId:admin?destination:undefined});
    const balance=useQuery(manager&&!scope.warehouseId?null:'wallet'+keys,()=>request<{balance:number}>('finance','/wallets'+keys));
    const warehouses=scope.warehouses.filter(w=>w.ownerCompanyId===owner);
    async function submit(e:React.FormEvent){
        e.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');
        try{await saveResource('finance',admin?'/wallets/top-up':'/wallets/allocate','POST',
            {requestId,companyId:owner,warehouseId:destination||null,amount:Number(amount)});
            setOpen(false);setAmount('');setRequestId(randomUUID());setNotice('Đã ghi nhận giao dịch ví.');
        }catch(e){setError(e instanceof Error?e.message:'Không thể ghi giao dịch.');}finally{setBusy(false);}
    }
    const title = admin ? 'Nạp tiền vào ví' : 'Chuyển tiền sang ví kho';
    const gross = Number(amount);
    const fee = Math.round(gross * 5) / 100;
    const close = () => { if (!busy) setOpen(false); };

    return <section className="wf-card wf-operation-stack">
        <h3>{admin && !company ? 'Ví phí WareFlow' : manager || admin && destination ? 'Ví kho' : 'Ví công ty'}</h3>
        {balance.loading && <p role="status">Đang tải số dư…</p>}
        {balance.error && <div role="alert">
            <p>{balance.error}</p>
            <button type="button" className="adm-btn" onClick={balance.reload}>Thử tải lại số dư</button>
        </div>}
        {balance.data && <p>Số dư khả dụng <strong>{formatCurrency(balance.data.balance)}</strong></p>}
        {!admin && !manager && <p>
            Nạp ví công ty qua quản trị viên WareFlow. Dùng số dư ví công ty để chuyển tiền sang ví kho.
        </p>}
        {!manager && <div className="wf-operation-actions">
            <button type="button" className="adm-btn adm-btn-primary" onClick={() => { setError(''); setOpen(true); }}>{title}</button>
        </div>}
        {notice && <p role="status">{notice}</p>}
        {open && <Modal title={title} onClose={close}>
            <form onSubmit={submit}>
                <fieldset disabled={busy} className="wf-form-stack">
                    {admin && <label className="wf-field"><span>Công ty</span>
                        <select required value={company} onChange={e => { setCompany(e.target.value); setDestination(''); setRequestId(randomUUID()); }}>
                            <option value="">Chọn công ty</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </label>}
                    <label className="wf-field"><span>Kho</span>
                        <select required={!admin} value={destination} onChange={e => { setDestination(e.target.value); setRequestId(randomUUID()); }}>
                            <option value="">{admin ? 'Ví công ty' : 'Chọn kho nhận'}</option>
                            {warehouses.map(w => <option key={String(w.id)} value={String(w.id)}>{String(w.name)}</option>)}
                        </select>
                    </label>
                    <label className="wf-field"><span>Số tiền</span>
                        <input type="number" required min=".01" step=".01" value={amount}
                            onChange={e => { setAmount(e.target.value); setRequestId(randomUUID()); }} />
                    </label>
                    <div className="wf-operation-stack">
                        <p>Phí dịch vụ (5%) <strong>{formatCurrency(fee)}</strong></p>
                        {admin
                            ? <p>Ví nhận <strong>{formatCurrency(gross - fee)}</strong></p>
                            : <>
                                <p>Ví kho nhận <strong>{formatCurrency(gross)}</strong></p>
                                <p>Ví công ty thanh toán <strong>{formatCurrency(gross + fee)}</strong></p>
                            </>}
                    </div>
                    {error && <p className="wf-notice" role="alert">{error}</p>}
                    <div className="wf-operation-actions">
                        <button type="button" className="adm-btn" onClick={close}>Hủy</button>
                        <button type="submit" className="adm-btn adm-btn-primary">{busy ? 'Đang xử lý…' : title}</button>
                    </div>
                </fieldset>
            </form>
        </Modal>}
    </section>;
}
