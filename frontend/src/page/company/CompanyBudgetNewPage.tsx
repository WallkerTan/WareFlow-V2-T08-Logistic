import OperationForm from '../../components/workspace/OperationForm';
import { useAdminData } from '../../services/data';
import { formatCurrency } from '../../utils/format';
import { Wallet } from 'lucide-react';

export default function CompanyBudgetNewPage() {
    const { raw } = useAdminData('transactions');
    const companyBalance = raw.transactions.reduce((acc, t) => acc + (t.type === 'INCOME' ? Number(t.amount || 0) : -Number(t.amount || 0)), 0);

    return (
        <section className="wf-section">
            <div className="admin-page-head">
                <div>
                    <h2>Cấp ngân sách cho kho</h2>
                    <p>Phân bổ hạn mức ngân sách hoạt động cho kho hàng từ số dư của công ty.</p>
                </div>
            </div>

            <div className="wf-card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: 'var(--workspace-gradient)', color: '#063426', borderRadius: 8 }}>
                <div style={{ width: 44, height: 44, borderRadius: 8, background: 'rgba(0,0,0,0.08)', display: 'grid', placeItems: 'center' }}>
                    <Wallet size={24} color="#063426" />
                </div>
                <div>
                    <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.85, fontWeight: 600 }}>
                        Số dư khả dụng hiện tại của công ty
                    </span>
                    <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2 }}>
                        {formatCurrency(companyBalance)}
                    </div>
                </div>
            </div>

            <OperationForm mode="budget" back="/company/finance" />
        </section>
    );
}
