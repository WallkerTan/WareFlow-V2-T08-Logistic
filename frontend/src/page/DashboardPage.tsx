import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Boxes, LogOut, MessageSquareText, PackageCheck, RefreshCw, Warehouse } from 'lucide-react';
import { clearAuthSession, getAuthSession } from '../services/authApi';
import './dashboard.css';

type WarehouseItem = { id: string; name: string; warehouseType: 'BUY' | 'RENT'; region: string; status: string; area: number | null; price: number | null };
type TransactionMessage = { message: string; offeredPrice?: number | null; senderRole: string; sentAt: string };
type TransactionItem = { id: string; warehouseId: string; warehouseName: string; type: string; status: string; offeredPrice: number | null; negotiation?: { messages?: TransactionMessage[] }; createdAt: string };
type Page<T> = { content?: T[]; totalElements?: number };

async function authorized<T>(path: string, token: string, init?: RequestInit): Promise<T> {
    const response = await fetch(path, { ...init, headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${token}`, ...init?.headers } });
    if (response.status === 401) throw new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
    if (!response.ok) {
        const result = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(result?.message || `Yêu cầu thất bại (HTTP ${response.status}).`);
    }
    return response.json() as Promise<T>;
}

export default function DashboardPage() {
    const navigate = useNavigate();
    const session = getAuthSession();
    const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
    const [transactions, setTransactions] = useState<TransactionItem[]>([]);
    const [total, setTotal] = useState(0);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState('');

    const reload = useCallback(async () => {
        const token = getAuthSession()?.accessToken;
        if (!token) {
            clearAuthSession();
            navigate('/auth/login', { replace: true });
            return;
        }
        setLoading(true); setError('');
        try {
            const [warehousePage, transactionPage] = await Promise.all([
                authorized<Page<WarehouseItem>>('/api/warehouses?page=0&size=20&sort=createdAt,desc', token),
                authorized<Page<TransactionItem>>('/api/warehouse-transactions?page=0&size=20&sort=createdAt,desc', token),
            ]);
            setWarehouses(warehousePage.content ?? []);
            setTotal(warehousePage.totalElements ?? warehousePage.content?.length ?? 0);
            setTransactions(transactionPage.content ?? []);
        } catch (reason) {
            const message = reason instanceof Error ? reason.message : 'Không tải được dữ liệu.';
            setError(message);
            if (message.includes('Phiên đăng nhập')) { clearAuthSession(); navigate('/auth/login', { replace: true }); }
        } finally { setLoading(false); }
    }, [navigate]);

    useEffect(() => { void reload(); }, [reload]);

    async function requestWarehouse(warehouse: WarehouseItem) {
        const token = getAuthSession()?.accessToken;
        if (!token) return navigate('/auth/login', { replace: true });
        const initialPrice = warehouse.price != null ? String(warehouse.price) : '';
        const input = window.prompt(`Nhập giá đề nghị cho kho “${warehouse.name}”:`, initialPrice);
        if (input === null) return;
        const offeredPrice = Number(input.replace(/,/g, '').trim());
        if (!Number.isFinite(offeredPrice) || offeredPrice <= 0) {
            setError('Giá đề nghị phải là số lớn hơn 0.'); return;
        }
        setBusyId(warehouse.id); setError(''); setNotice('');
        try {
            await authorized<TransactionItem>('/api/warehouse-transactions', token, { method: 'POST', body: JSON.stringify({ warehouseId: warehouse.id, type: warehouse.warehouseType, offeredPrice }) });
            setNotice(`Đã gửi đề nghị ${warehouse.warehouseType === 'BUY' ? 'mua' : 'thuê'} kho “${warehouse.name}”.`);
            await reload();
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không gửi được đề nghị.'); }
        finally { setBusyId(''); }
    }

    async function negotiate(transaction: TransactionItem) {
        const token = getAuthSession()?.accessToken;
        if (!token) return navigate('/auth/login', { replace: true });
        const message = window.prompt(`Nội dung thương lượng với admin về kho “${transaction.warehouseName}”:`);
        if (!message?.trim()) return;
        const priceInput = window.prompt('Giá đề nghị mới (để trống nếu không đổi giá):', transaction.offeredPrice == null ? '' : String(transaction.offeredPrice));
        if (priceInput === null) return;
        const offeredPrice = priceInput.trim() ? Number(priceInput.replace(/,/g, '').trim()) : undefined;
        if (offeredPrice !== undefined && (!Number.isFinite(offeredPrice) || offeredPrice <= 0)) { setError('Giá đề nghị phải là số lớn hơn 0.'); return; }
        setBusyId(transaction.id); setError(''); setNotice('');
        try {
            await authorized<TransactionItem>(`/api/warehouse-transactions/${transaction.id}/negotiations`, token, { method: 'POST', body: JSON.stringify({ message: message.trim(), offeredPrice }) });
            setNotice('Đã gửi nội dung thương lượng.'); await reload();
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không gửi được thương lượng.'); }
        finally { setBusyId(''); }
    }

    function logout() { clearAuthSession(); navigate('/auth/login', { replace: true }); }

    return <div className="dashboard-page">
        <aside className="dashboard-sidebar">
            <Link to="/dashboard" className="dashboard-brand">
                <img src="/logo.png" alt="WareFlow" className="dashboard-brand-img" />
                <span>ware<b>flow</b></span>
            </Link>
            <div className="dashboard-nav-label">KHÔNG GIAN LÀM VIỆC</div>
            <a href="#overview" className="dashboard-nav active"><Boxes size={18} /> Tổng quan</a>
            <a className="dashboard-nav" href="#warehouses"><Warehouse size={18} /> Kho mua/thuê</a>
            <a className="dashboard-nav" href="#my-offers"><MessageSquareText size={18} /> Đề nghị của tôi</a>
            <div className="dashboard-sidebar-bottom">
                <div className="dashboard-avatar">{session?.fullName?.slice(0, 1).toUpperCase() || 'W'}</div>
                <div className="dashboard-user"><strong>{session?.fullName || 'Người dùng'}</strong><span>{session?.role || ''}</span></div>
                <button className="dashboard-icon-button" onClick={logout} title="Đăng xuất" aria-label="Đăng xuất"><LogOut size={17} /></button>
            </div>
        </aside>
        <main className="dashboard-main" id="overview">
            <header className="dashboard-header"><div><span className="dashboard-kicker">WAREFLOW / WORKSPACE</span><h1>Tổng quan</h1></div><button className="dashboard-outline-button" onClick={() => void reload()} disabled={loading}><RefreshCw size={15} /> Làm mới</button></header>
            <p className="dashboard-welcome">Xin chào, <strong>{session?.fullName || 'bạn'}</strong>. Tìm kho và theo dõi đề nghị của công ty.</p>
            {notice && <div className="admin-feedback success">{notice}</div>}{error && <div className="admin-feedback error">{error}</div>}
            <section className="dashboard-stats" aria-label="Tóm tắt kho hàng"><article className="dashboard-stat"><span className="dashboard-stat-icon blue"><Warehouse size={19} /></span><span>Kho đang hiển thị</span><strong>{loading ? '…' : total}</strong><small>Kho có thể mua hoặc thuê</small></article><article className="dashboard-stat"><span className="dashboard-stat-icon green"><PackageCheck size={19} /></span><span>Đề nghị của công ty</span><strong>{transactions.length}</strong><small>{session?.companyName || session?.email || ''}</small></article></section>
            <section className="dashboard-panel" id="warehouses"><div className="dashboard-panel-heading"><div><h2>Kho có thể mua hoặc thuê</h2><p>Gửi đề nghị để admin xem xét và thương lượng</p></div><span>{total} kho</span></div>
                {loading ? <div className="dashboard-empty">Đang tải kho…</div> : warehouses.length === 0 ? <div className="dashboard-empty">Chưa có kho khả dụng.</div> : <div className="dashboard-table-wrap"><table className="dashboard-table"><thead><tr><th>Tên kho</th><th>Khu vực</th><th>Loại</th><th>Diện tích</th><th>Giá niêm yết</th><th></th></tr></thead><tbody>{warehouses.filter(item => item.status === 'AVAILABLE').map(item => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.region || '—'}</td><td>{item.warehouseType === 'BUY' ? 'Bán' : 'Cho thuê'}</td><td>{item.area != null ? `${item.area} m²` : '—'}</td><td>{item.price != null ? item.price.toLocaleString('vi-VN') : 'Liên hệ'}</td><td><button className="admin-primary-button" disabled={busyId === item.id} onClick={() => void requestWarehouse(item)}>{busyId === item.id ? 'Đang gửi…' : `Gửi đề nghị ${item.warehouseType === 'BUY' ? 'mua' : 'thuê'}`}</button></td></tr>)}</tbody></table></div>}
            </section>
            <section className="dashboard-panel admin-warehouse-panel" id="my-offers"><div className="dashboard-panel-heading"><div><h2>Đề nghị mua/thuê của tôi</h2><p>Theo dõi trạng thái và trao đổi với admin</p></div><span>{transactions.length} đề nghị</span></div>
                {loading ? <div className="dashboard-empty">Đang tải đề nghị…</div> : transactions.length === 0 ? <div className="dashboard-empty">Công ty chưa gửi đề nghị nào.</div> : <div className="dashboard-transaction-list">{transactions.map(transaction => <article className="dashboard-transaction" key={transaction.id}><div className="dashboard-transaction-top"><div><strong>{transaction.warehouseName}</strong><span>{transaction.type === 'BUY' ? 'Mua' : 'Thuê'} · {transaction.offeredPrice?.toLocaleString('vi-VN') ?? 'Chưa đề xuất giá'}</span></div><span className={`dashboard-status status-${transaction.status.toLowerCase()}`}>{transaction.status}</span></div>
                    <div className="dashboard-messages">{transaction.negotiation?.messages?.length ? transaction.negotiation.messages.map((message, index) => <p key={`${transaction.id}-${index}`}><strong>{message.senderRole === 'SYSTEM_ADMIN' ? 'Admin' : 'Công ty'}:</strong> {message.message}{message.offeredPrice != null ? ` · Giá đề xuất ${message.offeredPrice.toLocaleString('vi-VN')}` : ''}</p>) : <p>Chưa có nội dung thương lượng.</p>}</div>
                    {(transaction.status === 'PENDING' || transaction.status === 'NEGOTIATING') && <button className="dashboard-outline-button" disabled={busyId === transaction.id} onClick={() => void negotiate(transaction)}><MessageSquareText size={15} /> Thương lượng với admin</button>}
                </article>)}</div>}
            </section>
        </main>
    </div>;
}
