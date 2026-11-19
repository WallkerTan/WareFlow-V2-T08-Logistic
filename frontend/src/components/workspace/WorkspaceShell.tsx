import { useEffect, useState, useSyncExternalStore } from "react";
import { NavLink, Outlet, Link, useLocation, Navigate } from "react-router-dom";
import { ArrowUpRight, ChevronRight, Menu, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import WareFlowFooter from "../common/WareFlowFooter";
import "../../layout/main/main.css";
import "../../layout/admin/admin.css";
import "../../layout/main/workspace.css";
import "../../layout/main/roles.css";
import "./workspace-frame.css";

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

import {
    getAuthSession,
    clearAuthSession,
    roleHome,
    scheduleSessionExpiry,
} from "../../services/authApi";
import {
    WorkspaceProvider,
    DataStatus,
    WarehousePicker,
    useWorkspace,
} from "../../services/workspace";
import { clearData, useQuery } from "../../services/query";
import { request } from "../../services/api";

function WorkspaceOutlet({ scoped }: { scoped: boolean }) {
    const { warehouseId } = useWorkspace();
    return <Outlet key={scoped ? warehouseId : "workspace"} />;
}

export default function WorkspaceShell({
    config,
}: {
    config: WorkspaceConfig;
}) {
    const [expanded, setExpanded] = useState(false);
    const { pathname } = useLocation();
    const storedSession = useSyncExternalStore(
        (fn) => {
            window.addEventListener("wareflow.auth", fn);
            return () => window.removeEventListener("wareflow.auth", fn);
        },
        () => sessionStorage.getItem("wareflow.auth"),
    );
    const session = getAuthSession(storedSession);
    const expiresAt = session?.expiresAt;

    useEffect(() => {
        if (!expiresAt) return;
        return scheduleSessionExpiry(expiresAt);
    }, [expiresAt]);

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    }, [pathname]);

    const userProfileQuery = useQuery<{ avatar?: string; profile?: { avatar?: string; logo?: string } }>(
        session?.userId ? `user-profile:${session.userId}` : null,
        () => request('core', '/users/me').catch(() => ({} as { avatar?: string }))
    );
    const avatarUrl =
        userProfileQuery.data?.avatar ||
        userProfileQuery.data?.profile?.avatar ||
        (session as { avatar?: string } | null)?.avatar;

    if (!session) return <Navigate to="/auth/login" replace />;
    const allowedRole = {
        admin: "SYSTEM_ADMIN",
        company: "COMPANY_ADMIN",
        storehouse: "WAREHOUSE_MANAGER",
    }[config.role];
    if (session.role !== allowedRole)
        return <Navigate to={roleHome(session.role)} replace />;

    const page =
        config.links.find((link) => pathname === link.to.split("?")[0])
            ?.label || "Chi tiết";
    const Icon = config.icon;

    return (
        <WorkspaceProvider>
            <div
                className={`admin-shell wf-shell wf-role-${config.role}${expanded ? " wf-menu-open" : ""}`}
            >
                <aside className="wf-sidebar" id={`${config.role}-sidebar`}>
                    <div className="wf-sidebar-panel">
                        <Link
                            className="wf-brand"
                            to={config.home}
                            onClick={() => setExpanded(false)}
                        >
                            <img
                                src="/logo.png"
                                alt="WareFlow"
                                className="wf-brand-logo-img"
                            />
                            ware
                            <span>flow</span>
                        </Link>
                        <div className="wf-workspace">
                            <Icon size={22} />
                            <div>
                                <strong>{config.title}</strong>
                                <small>{config.description}</small>
                            </div>
                        </div>
                        <p className="wf-nav-label">{config.navLabel}</p>
                        <nav aria-label={`Điều hướng ${config.title}`}>
                            {config.links.map((link) => (
                                <NavLink
                                    key={link.to}
                                    to={link.to}
                                    onClick={() => setExpanded(false)}
                                >
                                    <link.icon size={19} />
                                    {link.label}
                                </NavLink>
                            ))}
                        </nav>
                        <div className="wf-sidebar-bottom">
                            <span className="wf-mini-mark">
                                <Icon size={16} />
                            </span>
                            <div>
                                <strong>{config.title}</strong>
                                <small>
                                    WareFlow · Quản lý kho & logistics
                                </small>
                            </div>
                        </div>
                    </div>
                </aside>
                <div className="wf-main">
                    <header className="wf-topbar">
                        <div className="wf-breadcrumb">
                            <button
                                className="wf-menu-button"
                                type="button"
                                aria-label={expanded ? "Đóng menu" : "Mở menu"}
                                aria-expanded={expanded}
                                aria-controls={`${config.role}-sidebar`}
                                onClick={() => setExpanded(!expanded)}
                            >
                                {expanded ? (
                                    <X size={19} />
                                ) : (
                                    <Menu size={19} />
                                )}
                            </button>
                            <Link to={config.home}>{config.title}</Link>
                            <ChevronRight size={13} />
                            <span>{page}</span>
                        </div>
                        <div className="wf-topbar-actions">
                            <span className="wf-role-badge">
                                {config.topbarLabel}
                            </span>
                            <Link
                                className="wf-account"
                                to={config.profile}
                                aria-label={`Hồ sơ ${config.title}`}
                            >
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt="Avatar"
                                        className="wf-account-avatar-img"
                                        style={{
                                            width: 31,
                                            height: 31,
                                            borderRadius: "50%",
                                            objectFit: "cover",
                                            display: "block",
                                        }}
                                    />
                                ) : (
                                    <span>{config.avatar}</span>
                                )}
                            </Link>
                            <Link
                                className="wf-signin"
                                to="/auth/login"
                                onClick={() => {
                                    clearAuthSession();
                                    clearData();
                                }}
                            >
                                Đăng xuất <ArrowUpRight size={15} />
                            </Link>
                        </div>
                    </header>
                    <main className="wf-content">
                        <DataStatus />
                        {config.role === "storehouse" && <WarehousePicker />}
                        <WorkspaceOutlet
                            scoped={config.role === "storehouse"}
                        />
                    </main>
                </div>
                <WareFlowFooter />
            </div>
        </WorkspaceProvider>
    );
}
