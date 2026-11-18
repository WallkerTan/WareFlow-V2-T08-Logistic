import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminData, saveResource } from '../../services/data';

/** A completed warehouse deal must be assigned before a manager can access its stock. */
export default function WarehouseAssignment({ warehouseId, companyId }: { warehouseId: string; companyId?: string }) {
    const { raw } = useAdminData('users', 'warehouseTransactions');
    const deal = raw.warehouseTransactions
        .filter(r => r.warehouseId === warehouseId && r.companyId === companyId &&
            r.status === 'COMPLETED' && (r.type === 'RENT' || r.type === 'BUY'))
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
    const [managerId, setManagerId] = useState('');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const managers = raw.users.filter(u => u.status === 'ACTIVE' && u.role === 'WAREHOUSE_MANAGER');
    async function submit(event: React.FormEvent) {
        event.preventDefault();
        if (!deal || busy || !managerId) return;
        setBusy(true); setMessage('');
        try {
            await saveResource('core', `/warehouse-transactions/${deal.id}/handover`, 'POST', { managerId, note });
            setMessage('Đã bàn giao kho cho nhân viên.');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Không bàn giao được kho.');
        } finally { setBusy(false); }
    }
    if (!deal) return null;
    return <section><h3>Bàn giao cho quản lý kho</h3><form onSubmit={submit}>
        <label className="wf-field"><span>Nhân viên nhận kho *</span><select required value={managerId} disabled={busy} onChange={e => setManagerId(e.target.value)}><option value="">Chọn nhân viên</option>{managers.map(u => <option key={String(u.id)} value={String(u.id)}>{String(u.fullName)}</option>)}</select></label>
        {!managers.length && <p><Link to="/company/employees/new">Tạo tài khoản quản lý kho</Link> trước khi bàn giao.</p>}
        <label className="wf-field"><span>Ghi chú bàn giao</span><textarea value={note} onChange={e => setNote(e.target.value)} maxLength={1000} /></label>
        {message && <p role="status">{message}</p>}
        <button className="wf-button wf-button-primary" type="submit" disabled={busy || !managerId}>{busy ? 'Đang bàn giao…' : 'Bàn giao kho'}</button>
    </form></section>;
}
