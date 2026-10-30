import { NavLink, Outlet, Link } from 'react-router-dom';
import { Building2, Warehouse, ShieldCheck, ArrowUpRight, PanelLeft, Layers3 } from 'lucide-react';
import './main.css';

export default function MainLayout() {
    return <div className="wf-shell">
        <aside className="wf-sidebar">
            <Link className="wf-brand" to="/company/profile"><span className="wf-brand-mark">W</span>ware<span>flow</span></Link>
            <div className="wf-workspace"><Layers3 size={22} /><div><strong>Không gian quản lý</strong><small>Hồ sơ & thông tin</small></div></div>
            <p className="wf-nav-label">QUẢN LÝ HỒ SƠ</p>
            <nav aria-label="Quản lý hồ sơ">
                <NavLink to="/company/profile"><Building2 size={19} />Hồ sơ công ty</NavLink>
                <NavLink to="/storehouse/profile"><Warehouse size={19} />Hồ sơ kho</NavLink>
                <NavLink to="/wareflow/profile"><ShieldCheck size={19} />Hồ sơ WareFlow</NavLink>
            </nav>
            <div className="wf-sidebar-bottom"><span className="wf-mini-mark">W</span><div><strong>WareFlow Workspace</strong><small>Quản lý kho & logistics</small></div></div>
        </aside>
        <div className="wf-main"><header className="wf-topbar"><span><PanelLeft size={19} /> Không gian làm việc <b>/</b> Hồ sơ</span><Link to="/auth/login">Đăng nhập <ArrowUpRight size={16} /></Link></header><main className="wf-content"><Outlet /></main><footer className="wf-footer">© {new Date().getFullYear()} WareFlow<span>Kết nối toàn bộ chuỗi vận hành.</span></footer></div>
    </div>;
}
