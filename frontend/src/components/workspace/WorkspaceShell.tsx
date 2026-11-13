import { Suspense, useState } from "react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { LogOut, ChevronRight, Menu, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import WareFlowFooter from '../common/WareFlowFooter';
import "../../layout/main/main.css";
import "../../layout/admin/admin.css";
import "../../layout/main/workspace.css";
import "../../layout/main/roles.css";
import './workspace-frame.css';
import '../../components/live/live.css';
import { useWorkspace } from '../live/workspaceContext';
import { Loading } from '../live/UI';
import { clearAuthSession } from '../../services/session';
import NotificationBell from '../live/NotificationBell';
import { useNavigate } from 'react-router-dom';
export type WorkspaceConfig = {
    role: "admin" | "company" | "storehouse";
    title: string;
    description: string;
    navLabel: string;
    home: string;
    profile: string;
    avatar: string;
    topbarLabel: string;
    icon: LucideIcon;
    links: {
        to: string;
        label: string;
        icon: LucideIcon;
    }[];
};
export default function WorkspaceShell({ config }: {
    config: WorkspaceConfig;
}) {
    const [expanded, setExpanded] = useState(false);
    const { session, user } = useWorkspace();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const page = config.links.find((link) => pathname === link.to.split("?")[0])
        ?.label || "Chi tiết";
    const Icon = config.icon;
    return (<div className={`admin-shell wf-shell wf-role-${config.role}${expanded ? " wf-menu-open" : ""}`}>
            <aside className="wf-sidebar" id={`${config.role}-sidebar`}>
                <div className="wf-sidebar-panel">
                <Link className="wf-brand" to={config.home} onClick={() => setExpanded(false)}>
                    <img src="/logo.png" alt="WareFlow" className="wf-brand-logo-img" />ware
                    <span>flow</span>
                </Link>
                <div className="wf-workspace">
                    <Icon size={22}/>
                    <div>
                        <strong>{config.title}</strong>
                        <small>{config.description}</small>
                    </div>
                </div>
                <p className="wf-nav-label">{config.navLabel}</p>
                <nav aria-label={`Điều hướng ${config.title}`}>
                    {config.links.map((link) => (<NavLink key={link.to} to={link.to} onClick={() => setExpanded(false)}>
                            <link.icon size={19}/>
                            {link.label}
                        </NavLink>))}
                </nav>
                <div className="wf-sidebar-bottom">
                    <span className="wf-mini-mark">
                        <Icon size={16}/>
                    </span>
                    <div>
                        <strong>{session.companyName || session.fullName}</strong>
                        <small>WareFlow · Quản lý kho & logistics</small>
                    </div>
                </div>
                </div>
            </aside>
            <div className="wf-main">
                <header className="wf-topbar">
                    <div className="wf-breadcrumb">
                        <button className="wf-menu-button" type="button" aria-label={expanded ? "Đóng menu" : "Mở menu"} aria-expanded={expanded} aria-controls={`${config.role}-sidebar`} onClick={() => setExpanded(!expanded)}>
                            {expanded ? <X size={19}/> : <Menu size={19}/>}
                        </button>
                        <Link to={config.home}>{config.title}</Link>
                        <ChevronRight size={13}/>
                        <span>{page}</span>
                    </div>
                    <div className="wf-topbar-actions">
                        <NotificationBell />
                        <span className="wf-role-badge">
                            {config.topbarLabel}
                        </span>
                        <Link className="wf-account" to={config.profile} aria-label={`Hồ sơ ${config.title}`}>
                            {user?.avatar ? <img src={String(user.avatar)} alt="Ảnh đại diện" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} /> : <span>{String(user?.fullName || session.fullName).slice(0, 2).toUpperCase() || config.avatar}</span>}
                        </Link>
                        <button className="wf-signin" aria-label="Đăng xuất" title="Đăng xuất" onClick={() => { clearAuthSession(); navigate('/auth/login', { replace: true }); }}>
                            <span className="wf-signin-label">Đăng xuất</span><LogOut size={15}/>
                        </button>
                    </div>
                </header>
                <main className="wf-content">
                    <Suspense fallback={<Loading />}><Outlet /></Suspense>
                </main>
            </div>
            <WareFlowFooter />
        </div>);
}
