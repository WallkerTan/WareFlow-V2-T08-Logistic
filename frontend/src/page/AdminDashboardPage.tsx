import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, LogOut, Plus, RefreshCw, Search, ShieldCheck, Warehouse } from 'lucide-react';
import { clearAuthSession, getAuthSession } from '../services/authApi';
import './dashboard.css';

type CompanyItem = { id: string; name: string; businessModel: string; status: string; createdAt: string };
type WarehouseItem = { id: string; name: string; warehouseType: string; region: string; status: string; area: number };
type TransactionMessage = { message: string; offeredPrice?: number | null; senderRole: string; sentAt: string };
type TransactionItem = { id: string; warehouseName: string; companyName: string; type: string; status: string; offeredPrice: number | null; negotiation?: { messages?: TransactionMessage[] } };
type Page<T> = { content?: T[]; totalElements?: number };
type WarehouseForm = { name: string; warehouseType: 'BUY' | 'RENT'; area: string; price: string; region: string; address: string };

async function api<T>(path: string, token: string, init?: RequestInit): Promise<T> {
    const response = await fetch(path, {
        ...init,
        headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${token}`, ...init?.headers },
    });
    if (response.status === 401) throw new Error('Phiên đăng nhập hết hạn. Hãy đăng nhập lại.');
    if (!response.ok) {
        const body = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(body?.message || `Yêu cầu thất bại (HTTP ${response.status}).`);
    }
    return response.json() as Promise<T>;
}

export default function AdminDashboardPage() {
    const navigate = useNavigate();
    const session = getAuthSession();
    const [companies, setCompanies] = useState<CompanyItem[]>([]);
    const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
    const [transactions, setTransactions] = useState<TransactionItem[]>([]);
    const [companyTotal, setCompanyTotal] = useState(0);
    const [warehouseTotal, setWarehouseTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [companyStatus, setCompanyStatus] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showWarehouseForm, setShowWarehouseForm] = useState(false);

    const loadCompanies = useCallback(async () => {
        const token = getAuthSession()?.accessToken;
        if (!token) throw new Error('Không tìm thấy phiên đăng nhập. Vui lòng đăng nhập lại.');
        const params = new URLSearchParams({ page: '0', size: '20', sort: 'createdAt,desc' });
        if (search.trim()) params.set('search', search.trim());
        if (companyStatus) params.set('status', companyStatus);
        const page = await api<Page<CompanyItem>>(`/api/companies?${params}`, token);
        setCompanies(page.content ?? []);
        setCompanyTotal(page.totalElements ?? page.content?.length ?? 0);
    }, [search, companyStatus]);

    const loadWarehouses = useCallback(async () => {
        const token = getAuthSession()?.accessToken;
        if (!token) throw new Error('Không tìm thấy phiên đăng nhập. Vui lòng đăng nhập lại.');
        const page = await api<Page<WarehouseItem>>('/api/warehouses?page=0&size=10&sort=createdAt,desc', token);
        setWarehouses(page.content ?? []);
        setWarehouseTotal(page.totalElements ?? page.content?.length ?? 0);
    }, []);

    const loadTransactions = useCallback(async () => {
        const token = getAuthSession()?.accessToken;
        if (!token) throw new Error('Không tìm thấy phiên đăng nhập. Vui lòng đăng nhập lại.');
        const page = await api<Page<TransactionItem>>('/api/warehouse-transactions?page=0&size=30&sort=createdAt,desc', token);
        setTransactions(page.content ?? []);
    }, []);

    const reload = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            await Promise.all([loadCompanies(), loadWarehouses(), loadTransactions()]);
        } catch (reason) {
            const message = reason instanceof Error ? reason.message : 'Không tải được dữ liệu quản trị.';
            setError(message);
            if (message.includes('Phiên đăng nhập') || message.includes('Không tìm thấy phiên')) {
                clearAuthSession();
                navigate('/auth/login', { replace: true });
            }
        } finally {
            setLoading(false);
        }
    }, [loadCompanies, loadWarehouses, loadTransactions, navigate]);

    useEffect(() => { void reload(); }, [reload]);

    async function changeCompanyStatus(company: CompanyItem, status: string) {
        const token = getAuthSession()?.accessToken;
        if (!token) return navigate('/auth/login', { replace: true });
        const reason = status === 'LOCKED' ? window.prompt(`Lý do khóa công ty ${company.name}:`, 'Vi phạm chính sách') : null;
        if (status === 'LOCKED' && reason === null) return;
        setSaving(true);
        setNotice(''); setError('');
        try {
            await api<CompanyItem>(`/api/companies/${company.id}/status`, token, {
                method: 'PATCH', body: JSON.stringify({ status, reason: reason || undefined }),
            });
            setNotice(`Đã cập nhật trạng thái công ty “${company.name}”.`);
            await reload();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Không cập nhật được trạng thái công ty.');
        } finally { setSaving(false); }
    }

    async function createWarehouse(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const token = getAuthSession()?.accessToken;
        if (!token) return navigate('/auth/login', { replace: true });
        const data = new FormData(form);
        const payload: WarehouseForm = {
            name: String(data.get('name') || '').trim(),
            warehouseType: String(data.get('warehouseType') || 'RENT') as WarehouseForm['warehouseType'],
            area: String(data.get('area') || ''), price: String(data.get('price') || ''),
            region: String(data.get('region') || '').trim(), address: String(data.get('address') || '').trim(),
        };
        setSaving(true); setError(''); setNotice('');
        try {
            await api<WarehouseItem>('/api/warehouses', token, { method: 'POST', body: JSON.stringify({
                ...payload, area: Number(payload.area), price: Number(payload.price), address: payload.address || null,
            }) });
            setNotice('Đã tạo kho hệ thống mới.');
            setShowWarehouseForm(false);
            form.reset();
            await reload();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Không tạo được kho.');
        } finally { setSaving(false); }
    }

    async function negotiate(transaction: TransactionItem) {
        const token = getAuthSession()?.accessToken;
        if (!token) return navigate('/auth/login', { replace: true });
        const message = window.prompt(`Phản hồi đề nghị của ${transaction.companyName} về kho “${transaction.warehouseName}”:`);
        if (!message?.trim()) return;
        const priceInput = window.prompt('Giá đề xuất mới (để trống nếu không đổi giá):', transaction.offeredPrice == null ? '' : String(transaction.offeredPrice));
        if (priceInput === null) return;
        const offeredPrice = priceInput.trim() ? Number(priceInput.replace(/,/g, '').trim()) : undefined;
        if (offeredPrice !== undefined && (!Number.isFinite(offeredPrice) || offeredPrice <= 0)) { setError('Giá đề xuất phải là số lớn hơn 0.'); return; }
        setSaving(true); setError(''); setNotice('');
        try {
            await api<TransactionItem>(`/api/warehouse-transactions/${transaction.id}/negotiations`, token, { method: 'POST', body: JSON.stringify({ message: message.trim(), offeredPrice }) });
            setNotice('Đã gửi phản hồi thương lượng cho công ty.'); await reload();
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không gửi được phản hồi.'); }
        finally { setSaving(false); }
    }

    async function decide(transaction: TransactionItem, decision: 'approve' | 'reject') {
        const token = getAuthSession()?.accessToken;
        if (!token) return navigate('/auth/login', { replace: true });
        let reason: string | undefined;
        if (decision === 'reject') {
            const value = window.prompt(`Lý do từ chối đề nghị của ${transaction.companyName}:`);
            if (value === null) return;
            reason = value.trim() || undefined;
        }
        setSaving(true); setError(''); setNotice('');
        try {
            const suffix = decision === 'reject' && reason ? `?reason=${encodeURIComponent(reason)}` : '';
            await api<TransactionItem>(`/api/warehouse-transactions/${transaction.id}/${decision}${suffix}`, token, { method: 'POST' });
            setNotice(decision === 'approve' ? 'Đã duyệt đề nghị.' : 'Đã từ chối đề nghị.'); await reload();
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không xử lý được đề nghị.'); }
        finally { setSaving(false); }
    }

    function logout() { clearAuthSession(); navigate('/auth/login', { replace: true }); }

    return <div className="dashboard-page">
        <aside className="dashboard-sidebar">
            <a href="/admin/dashboard" className="dashboard-brand"><span>W</span> ware<b>flow</b></a>
            <div className="dashboard-nav-label">QUẢN TRỊ HỆ THỐNG</div>
            <a href="#admin-overview" className="dashboard-nav active"><ShieldCheck size={18} /> Tổng quan admin</a>
            <a href="#companies" className="dashboard-nav"><Building2 size={18} /> Quản lý công ty</a>
            <a href="#warehouses" className="dashboard-nav"><Warehouse size={18} /> Kho hệ thống</a>
            <a href="#transactions" className="dashboard-nav"><ShieldCheck size={18} /> Đề nghị giao dịch</a>
            <div className="dashboard-sidebar-bottom">
                <div className="dashboard-avatar">{session?.fullName?.slice(0, 1).toUpperCase() || 'A'}</div>
                <div className="dashboard-user"><strong>{session?.fullName || 'Quản trị viên'}</strong><span>SYSTEM_ADMIN</span></div>
                <button className="dashboard-icon-button" onClick={logout} title="Đăng xuất" aria-label="Đăng xuất"><LogOut size={17} /></button>
            </div>
        </aside>
        <main className="dashboard-main" id="admin-overview">
            <header className="dashboard-header">
                <div><span className="dashboard-kicker">WAREFLOW / SYSTEM ADMIN</span><h1>Quản trị hệ thống</h1></div>
                <button className="dashboard-outline-button" onClick={() => void reload()} disabled={loading}><RefreshCw size={15} /> Làm mới</button>
            </header>
            <p className="dashboard-welcome">Xin chào, <strong>{session?.fullName || 'Quản trị viên'}</strong>. Quản lý công ty và kho trên toàn hệ thống.</p>
            {notice && <div className="admin-feedback success">{notice}</div>}
            {error && <div className="admin-feedback error">{error}</div>}
            <section className="dashboard-stats" aria-label="Tóm tắt hệ thống">
                <article className="dashboard-stat"><span className="dashboard-stat-icon blue"><Building2 size={19} /></span><span>Tổng số công ty</span><strong>{loading ? '…' : companyTotal}</strong><small>Đăng ký trên hệ thống</small></article>
                <article className="dashboard-stat"><span className="dashboard-stat-icon green"><Warehouse size={19} /></span><span>Tổng số kho</span><strong>{loading ? '…' : warehouseTotal}</strong><small>Kho do WareFlow quản lý</small></article>
            </section>
            <section className="dashboard-panel" id="companies">
                <div className="dashboard-panel-heading"><div><h2>Quản lý công ty</h2><p>Tìm kiếm, lọc và cập nhật trạng thái công ty</p></div><span>{companyTotal} công ty</span></div>
                <div className="admin-toolbar"><label className="admin-search"><Search size={16} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm theo tên công ty" /></label><select value={companyStatus} onChange={event => setCompanyStatus(event.target.value)} aria-label="Lọc trạng thái công ty"><option value="">Tất cả trạng thái</option><option value="PENDING">Chờ duyệt</option><option value="ACTIVE">Đang hoạt động</option><option value="LOCKED">Đã khóa</option></select></div>
                {loading ? <div className="dashboard-empty">Đang tải công ty…</div> : companies.length === 0 ? <div className="dashboard-empty">Không có công ty phù hợp.</div> :
                    <div className="dashboard-table-wrap"><table className="dashboard-table"><thead><tr><th>Tên công ty</th><th>Lĩnh vực</th><th>Trạng thái</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead><tbody>
                        {companies.map(company => <tr key={company.id}><td><strong>{company.name}</strong></td><td>{company.businessModel || '—'}</td><td><span className={`dashboard-status status-${company.status?.toLowerCase()}`}>{company.status || '—'}</span></td><td>{company.createdAt ? new Date(company.createdAt).toLocaleDateString('vi-VN') : '—'}</td><td><div className="admin-actions">{company.status !== 'ACTIVE' && <button disabled={saving} onClick={() => void changeCompanyStatus(company, 'ACTIVE')}>{company.status === 'LOCKED' ? 'Mở khóa' : 'Kích hoạt'}</button>}{company.status !== 'LOCKED' && <button className="danger" disabled={saving} onClick={() => void changeCompanyStatus(company, 'LOCKED')}>Khóa</button>}</div></td></tr>)}
                    </tbody></table></div>}
            </section>
            <section className="dashboard-panel admin-warehouse-panel" id="warehouses">
                <div className="dashboard-panel-heading"><div><h2>Kho hệ thống</h2><p>Danh sách và tạo kho bán hoặc cho thuê</p></div><button className="admin-primary-button" onClick={() => setShowWarehouseForm(value => !value)}><Plus size={15} /> Tạo kho</button></div>
                {showWarehouseForm && <form className="admin-warehouse-form" onSubmit={createWarehouse}>
                    <label>Tên kho<input name="name" required maxLength={255} /></label><label>Loại kho<select name="warehouseType"><option value="RENT">Cho thuê</option><option value="BUY">Bán</option></select></label>
                    <label>Diện tích (m²)<input name="area" type="number" min="0.01" step="0.01" required /></label><label>Giá<input name="price" type="number" min="0" step="0.01" required /></label>
                    <label>Khu vực<input name="region" required maxLength={255} /></label><label>Địa chỉ<input name="address" maxLength={1000} /></label>
                    <div className="admin-form-actions"><button type="button" className="dashboard-outline-button" onClick={() => setShowWarehouseForm(false)}>Hủy</button><button className="admin-primary-button" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu kho'}</button></div>
                </form>}
                {loading ? <div className="dashboard-empty">Đang tải kho…</div> : warehouses.length === 0 ? <div className="dashboard-empty">Chưa có kho hệ thống.</div> :
                    <div className="dashboard-table-wrap"><table className="dashboard-table"><thead><tr><th>Tên kho</th><th>Khu vực</th><th>Loại</th><th>Diện tích</th><th>Trạng thái</th></tr></thead><tbody>
                        {warehouses.map(item => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.region || '—'}</td><td>{item.warehouseType || '—'}</td><td>{item.area} m²</td><td><span className="dashboard-status">{item.status || '—'}</span></td></tr>)}
                    </tbody></table></div>}
            </section>
            <section className="dashboard-panel admin-warehouse-panel" id="transactions">
                <div className="dashboard-panel-heading"><div><h2>Đề nghị mua/thuê</h2><p>Thương lượng, duyệt hoặc từ chối đề nghị từ các công ty</p></div><span>{transactions.filter(item => item.status === 'PENDING' || item.status === 'NEGOTIATING').length} cần xử lý</span></div>
                {loading ? <div className="dashboard-empty">Đang tải đề nghị…</div> : transactions.length === 0 ? <div className="dashboard-empty">Chưa có đề nghị mua/thuê nào.</div> : <div className="dashboard-transaction-list">{transactions.map(transaction => <article className="dashboard-transaction" key={transaction.id}>
                    <div className="dashboard-transaction-top"><div><strong>{transaction.warehouseName}</strong><span>{transaction.companyName} · {transaction.type === 'BUY' ? 'Mua' : 'Thuê'} · {transaction.offeredPrice?.toLocaleString('vi-VN') ?? 'Chưa đề xuất giá'}</span></div><span className={`dashboard-status status-${transaction.status.toLowerCase()}`}>{transaction.status}</span></div>
                    <div className="dashboard-messages">{transaction.negotiation?.messages?.length ? transaction.negotiation.messages.map((message, index) => <p key={`${transaction.id}-${index}`}><strong>{message.senderRole === 'SYSTEM_ADMIN' ? 'Admin' : 'Công ty'}:</strong> {message.message}{message.offeredPrice != null ? ` · Giá đề xuất ${message.offeredPrice.toLocaleString('vi-VN')}` : ''}</p>) : <p>Chưa có nội dung thương lượng.</p>}</div>
                    {(transaction.status === 'PENDING' || transaction.status === 'NEGOTIATING') && <div className="admin-actions"><button disabled={saving} onClick={() => void negotiate(transaction)}>Thương lượng</button><button disabled={saving} onClick={() => void decide(transaction, 'approve')}>Duyệt</button><button className="danger" disabled={saving} onClick={() => void decide(transaction, 'reject')}>Từ chối</button></div>}
                </article>)}</div>}
            </section>
        </main>
    </div>;
}
