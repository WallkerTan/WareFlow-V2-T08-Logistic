import { Link, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Boxes, Check, Package, Truck, Warehouse } from 'lucide-react';
import './auth.css';

export default function AuthLayout() {
    const isRegister = useLocation().pathname.endsWith('register');
    return <div className="auth-page">
        <aside className="auth-aside">
            <Link to="/" className="wareflow-brand" aria-label="WareFlow trang chủ"><span className="brand-icon">W</span><span>ware<span className="brand-blue">flow</span></span></Link>
            <div className="auth-story">
                <span className="auth-eyebrow"><span /> QUẢN LÝ KHO THẾ HỆ MỚI</span>
                <h1>Vận hành kho<br /><em>thông minh</em> hơn.</h1>
                <p>Kết nối hàng tồn, đơn hàng và logistics trong một nền tảng. Để mỗi quyết định đều đi trước một bước.</p>
                <div className="warehouse-preview" aria-label="Minh họa tổng quan quản lý kho">
                    <div className="preview-heading"><span><span className="mini-logo">W</span> Tổng quan kho hàng</span><span className="live-badge"><i /> Trực quan</span></div>
                    <div className="preview-stats"><div><span>Tổng sản phẩm</span><strong>2.840 <Boxes size={19} /></strong><small>Được quản lý tập trung</small></div><div><span>Đơn đang xử lý</span><strong>128 <Package size={19} /></strong><small>Theo dõi từng bước</small></div></div>
                    <div className="preview-chart"><div className="chart-title"><span>Luồng hàng trong tuần</span><ArrowUpRight size={16} /></div><div className="chart-bars">{[40, 64, 48, 80, 62, 91, 74].map((height, i) => <div key={i}><span style={{ height: `${height}%` }} /><small>{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][i]}</small></div>)}</div></div>
                    <div className="preview-delivery"><span className="delivery-icon"><Truck size={19} /></span><div><strong>Sẵn sàng cho mọi đơn hàng</strong><span>Từ nhập kho đến giao hàng</span></div><span className="delivery-check"><Check size={15} /></span></div>
                </div>
                <div className="auth-benefits"><span><Check size={15} /> Quản lý tập trung</span><span><Check size={15} /> Vận hành liền mạch</span></div>
            </div>
            <p className="aside-footer"><Warehouse size={16} /> Một nền tảng. Toàn bộ chuỗi vận hành.</p>
        </aside>
        <main className="auth-main">
            <div className="auth-topbar"><Link to="/"><ArrowLeft size={16} /> Trang chủ</Link><span>WAREFLOW / WORKSPACE</span></div>
            <div className={`auth-content ${isRegister ? 'auth-content-register' : ''}`}>
                <span className="form-eyebrow">{isRegister ? 'BẮT ĐẦU CÙNG WAREFLOW' : 'KHÔNG GIAN LÀM VIỆC CỦA BẠN'}</span>
                <h2>{isRegister ? 'Đăng ký công ty' : 'Chào mừng trở lại' }<span className="heading-dot">.</span></h2>
                <p className="auth-description">{isRegister ? 'Thiết lập không gian làm việc và bắt đầu quản lý doanh nghiệp của bạn.' : 'Đăng nhập để tiếp tục quản lý và kết nối mọi hoạt động kho hàng.'}</p>
                <nav className="auth-tabs" aria-label="Tài khoản"><Link to="/auth/login" aria-current={!isRegister ? 'page' : undefined}>Đăng nhập</Link><Link to="/auth/register" aria-current={isRegister ? 'page' : undefined}>Đăng ký công ty</Link></nav>
                <Outlet />
            </div>
            <footer className="auth-footer">© {new Date().getFullYear()} WareFlow<span>Nền tảng quản lý kho & logistics</span></footer>
        </main>
    </div>;
}
