import { useMemo, useState } from 'react';
import { Check, X, Building2 } from 'lucide-react';
import { Badge, Card, EmptyState, Modal } from '../../components/admin/AdminUI';
import { useAdminData, saveResource, attempt } from '../../services/data';
import type { Company } from '../../types/admin';
import { businessModelMeta, formatRelativeTime } from '../../utils/format';

export default function AdminCompanyApprovals() {
    const { companies: allCompanies } = useAdminData();
    const pending = useMemo(
        () => allCompanies.filter((c) => c.status === 'PENDING'),
        [allCompanies],
    );
    const [confirmCompany, setConfirmCompany] = useState<{ company: Company; action: 'approve' | 'reject' } | null>(null);
    const [busy, setBusy] = useState(false);

    async function handleAction(company: Company, action: 'approve' | 'reject') {
        setBusy(true);
        const status = action === 'approve' ? 'ACTIVE' : 'LOCKED';
        await attempt(() =>
            saveResource('core', `/companies/${company.id}/status`, 'PATCH', { status }),
        );
        setBusy(false);
        setConfirmCompany(null);
    }

    return (
        <>
            <div className="admin-page-head">
                <div>
                    <h2>Duyệt công ty</h2>
                    <p>Các công ty đang chờ phê duyệt từ người dùng đăng ký.</p>
                </div>
            </div>

            <Card title="Danh sách chờ duyệt" subtitle={`${pending.length} công ty`}>
                {pending.length === 0 ? (
                    <EmptyState
                        icon={<Building2 size={32} />}
                        title="Không có công ty nào chờ duyệt"
                        description="Khi người dùng đăng ký công ty mới, chúng sẽ xuất hiện ở đây."
                    />
                ) : (
                    <div className="adm-table-wrap">
                        <table className="adm-table">
                            <thead>
                                <tr>
                                    <th>Tên công ty</th>
                                    <th>Mã số thuế</th>
                                    <th>Email</th>
                                    <th>Lĩnh vực</th>
                                    <th>Thời gian đăng ký</th>
                                    <th>Trạng thái</th>
                                    <th>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pending.map((company) => {
                                    const biz = businessModelMeta[company.businessModel as keyof typeof businessModelMeta];
                                    return (
                                        <tr key={company.id}>
                                            <td><strong>{company.name}</strong></td>
                                            <td>{company.taxCode || '—'}</td>
                                            <td>{company.email}</td>
                                            <td>
                                                {biz ? (
                                                    <Badge label={biz.label} tone={biz.tone as 'info'} />
                                                ) : (
                                                    company.businessModel
                                                )}
                                            </td>
                                            <td>{formatRelativeTime(company.createdAt)}</td>
                                            <td>
                                                <Badge label="Chờ duyệt" tone="warning" />
                                            </td>
                                            <td>
                                                <div className="adm-actions">
                                                    <button
                                                        className="adm-btn adm-btn-primary"
                                                        onClick={() => setConfirmCompany({ company, action: 'approve' })}
                                                    >
                                                        <Check size={14} /> Duyệt
                                                    </button>
                                                    <button
                                                        className="adm-btn adm-btn-danger"
                                                        onClick={() => setConfirmCompany({ company, action: 'reject' })}
                                                    >
                                                        <X size={14} /> Từ chối
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {confirmCompany && (
                <Modal
                    title={confirmCompany.action === 'approve' ? 'Xác nhận duyệt công ty' : 'Từ chối công ty'}
                    description={
                        confirmCompany.action === 'approve'
                            ? `Duyệt và kích hoạt công ty "${confirmCompany.company.name}"?`
                            : `Từ chối và khóa công ty "${confirmCompany.company.name}"?`
                    }
                    onClose={() => setConfirmCompany(null)}
                    footer={
                        <>
                            <button className="adm-btn" onClick={() => setConfirmCompany(null)}>
                                Hủy
                            </button>
                            <button
                                className={`adm-btn ${confirmCompany.action === 'approve' ? 'adm-btn-primary' : 'adm-btn-danger'}`}
                                disabled={busy}
                                onClick={() => handleAction(confirmCompany.company, confirmCompany.action)}
                            >
                                {busy
                                    ? 'Đang xử lý…'
                                    : confirmCompany.action === 'approve'
                                    ? 'Xác nhận duyệt'
                                    : 'Xác nhận từ chối'}
                            </button>
                        </>
                    }
                >
                    <div className={`adm-inline-note ${confirmCompany.action === 'reject' ? 'is-danger' : 'is-success'}`}>
                        {confirmCompany.action === 'approve' ? <Check size={15} /> : <X size={15} />}
                        <span>
                            {confirmCompany.action === 'approve'
                                ? `Công ty "${confirmCompany.company.name}" sẽ được kích hoạt và có thể hoạt động trên hệ thống.`
                                : `Công ty "${confirmCompany.company.name}" sẽ bị khóa và không thể đăng nhập.`}
                        </span>
                    </div>
                </Modal>
            )}
        </>
    );
}
