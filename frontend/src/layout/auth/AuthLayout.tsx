import { Link, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeft, Boxes, Check, Package, Truck, Warehouse } from 'lucide-react';
import './auth.css';

export default function AuthLayout() {
    const pathname = useLocation().pathname;
    const isRegister = pathname.endsWith('register');
    const isForgot = pathname.endsWith('forgot-password');
    return <div className="auth-page">
        <aside className="auth-aside">
            <Link to="/" className="wareflow-brand" aria-label="WareFlow trang chủ">
                <img src="/logo.png" alt="WareFlow" className="brand-logo-img auth-brand-logo" />
                <span>ware<span className="brand-blue">flow</span></span>
            </Link>
            <div className="auth-story">
                <span className="auth-eyebrow"><span /> QUẢN LÝ KHO THẾ HỆ MỚI</span>
                <h1>Vận hành kho<br /><em>thông minh</em> hơn.</h1>
                <p>Kết nối hàng tồn, đơn hàng và logistics trong một nền tảng. Để mỗi quyết định đều đi trước một bước.</p>
                <section className="warehouse-preview" aria-label="Chức năng WareFlow"><div className="preview-heading"><span><img src="/logo.png" alt="WF" className="mini-logo-img"/>Quản lý kho và giao nhận</span></div><div className="auth-function-list">{[{icon:Boxes,title:'Hàng hóa và tồn kho',description:'Theo dõi sản phẩm, lô và hạn sử dụng.'},{icon:Package,title:'Nhập, xuất và phê duyệt',description:'Xử lý phiếu theo quyền được cấp.'},{icon:Truck,title:'Giao hàng và thu hộ',description:'Theo dõi vận đơn và ghi nhận COD.'}].map(item=><div key={item.title}><item.icon size={21}/><div><strong>{item.title}</strong><p>{item.description}</p></div></div>)}</div></section>
                <div className="auth-benefits"><span><Check size={15} /> Quản lý tập trung</span><span><Check size={15} /> Vận hành liền mạch</span></div>
            </div>
            <p className="aside-footer"><Warehouse size={16} /> Một nền tảng. Toàn bộ chuỗi vận hành.</p>
        </aside>
        <main className="auth-main">
            <div className="auth-topbar"><Link to="/"><ArrowLeft size={16} /> Trang chủ</Link><span>WAREFLOW / WORKSPACE</span></div>
            <div className={`auth-content ${isRegister ? 'auth-content-register' : ''}`}>
                <span className="form-eyebrow">{isRegister ? 'BẮT ĐẦU CÙNG WAREFLOW' : 'KHÔNG GIAN LÀM VIỆC CỦA BẠN'}</span>
                <h2>{isForgot ? 'Quên mật khẩu' : isRegister ? 'Đăng ký công ty' : 'Chào mừng trở lại' }<span className="heading-dot">.</span></h2>
                <p className="auth-description">{isRegister ? 'Thiết lập không gian làm việc và bắt đầu quản lý doanh nghiệp của bạn.' : 'Đăng nhập để tiếp tục quản lý và kết nối mọi hoạt động kho hàng.'}</p>
                <nav className="auth-tabs" aria-label="Tài khoản"><Link to="/auth/login" aria-current={!isRegister ? 'page' : undefined}>Đăng nhập</Link><Link to="/auth/register" aria-current={isRegister ? 'page' : undefined}>Đăng ký công ty</Link></nav>
                <Outlet />
            </div>
        </main>
    </div>;
}
