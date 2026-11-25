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
    return (
        <section className="warehouse-assignment-section" style={{ margin: '16px 0 24px 0' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#172139' }}>
                Bàn giao cho quản lý kho
            </h3>
            <form onSubmit={submit}>
                <div style={{ display: 'grid', gap: 14 }}>
                    <label className="wf-field" style={{ margin: 0 }}>
                        <span>Nhân viên nhận kho *</span>
                        <select required value={managerId} disabled={busy} onChange={e => setManagerId(e.target.value)}>
                            <option value="">Chọn nhân viên</option>
                            {managers.map(u => <option key={String(u.id)} value={String(u.id)}>{String(u.fullName)}</option>)}
                        </select>
                    </label>
                    {!managers.length && (
                        <p style={{ margin: 0, fontSize: 12, color: '#e02424' }}>
                            <Link to="/company/employees/new">Tạo tài khoản quản lý kho</Link> trước khi bàn giao.
                        </p>
                    )}
                    <label className="wf-field" style={{ margin: 0 }}>
                        <span>Ghi chú bàn giao</span>
                        <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={1000} rows={3} style={{ resize: 'vertical' }} />
                    </label>
                    {message && <p role="status" className="wf-notice" style={{ margin: 0 }}>{message}</p>}
                    <div style={{ marginTop: 8, marginBottom: 8 }}>
                        <button className="adm-btn adm-btn-primary" type="submit" disabled={busy || !managerId}>
                            {busy ? 'Đang bàn giao…' : 'Bàn giao kho'}
                        </button>
                    </div>
                </div>
            </form>
        </section>
    );
}
