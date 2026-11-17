import { useState } from "react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { ArrowUpRight, ChevronRight, Menu, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import WareFlowFooter from '../common/WareFlowFooter';
import "../../layout/main/main.css";
import "../../layout/admin/admin.css";
import "../../layout/main/workspace.css";
import "../../layout/main/roles.css";
import './workspace-frame.css';
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
    const { pathname } = useLocation();
    const page = config.links.find((link) => pathname === link.to.split("?")[0])
        ?.label || "Xem thử phê duyệt";
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
                <div className="workspace-switch"><small>XEM GIAO DIỆN THEO VAI TRÒ</small><Link to="/admin/dashboard">Quản trị hệ thống</Link><Link to="/company/dashboard">Công ty</Link><Link to="/storehouse/inventory">Quản lý kho</Link></div><div className="wf-sidebar-bottom">
                    <span className="wf-mini-mark">
                        <Icon size={16}/>
                    </span>
                    <div>
                        <strong>{config.title}</strong>
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
                        <span className="wf-role-badge">
                            {config.topbarLabel}
                        </span>
                        <Link className="wf-account" to={config.profile} aria-label={`Hồ sơ ${config.title}`}>
                            <span>{config.avatar}</span>
                        </Link>
                        <Link className="wf-signin" to="/auth/login">
                            Đăng nhập <ArrowUpRight size={15}/>
                        </Link>
                    </div>
                </header>
                <main className="wf-content">
                    <Outlet />
                </main>
            </div>
            <WareFlowFooter />
        </div>);
}
