import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { NavLink, Outlet, Link, useLocation, Navigate } from "react-router-dom";
import { ArrowUpRight, ChevronRight, Menu, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import WareFlowFooter from "../common/WareFlowFooter";
import { FrameButtonLink } from "../ui/Button";
import "../../layout/main/main.css";
import "../../layout/admin/admin.css";
import "../../layout/main/workspace.css";
import "../../layout/main/roles.css";
import "./workspace-frame.css";
import WorkspaceAssistant from "./WorkspaceAssistant";

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
    DataLoadingOverlay,
    WarehousePicker,
    useWorkspace,
} from "../../services/workspace";
import { useQuery } from "../../services/query";
import { request } from "../../services/api";

function WorkspaceOutlet({ scoped }: { scoped: boolean }) {
    const { warehouseId, loading } = useWorkspace();
    if (scoped && !loading && !warehouseId) {
        return (
            <div className="wf-notice" role="alert" style={{ marginBottom: 16 }}>
                Tài khoản chưa được bàn giao kho. Vui lòng liên hệ quản trị viên để được phân công kho làm việc.
            </div>
        );
    }
    return <Outlet key={scoped ? warehouseId : "workspace"} />;
}

function WorkspaceAccount({ config, fallbackAvatar }: { config: WorkspaceConfig; fallbackAvatar?: string }) {
    const { warehouse } = useWorkspace();
    const warehouseAvatar = config.role === "storehouse" && typeof warehouse?.avatar === "string"
        ? warehouse.avatar
        : undefined;
    const avatar = warehouseAvatar || fallbackAvatar;
    return (
        <Link className="wf-account" to={config.profile} aria-label={`Hồ sơ ${config.title}`}>
            {avatar ? <img src={avatar} alt="Avatar" className="wf-account-avatar-img" /> : <span>{config.avatar}</span>}
        </Link>
    );
}

export default function WorkspaceShell({
    config,
}: {
    config: WorkspaceConfig;
}) {
    const [expanded, setExpanded] = useState(false);
    const [compact, setCompact] = useState(false);
    const contentScroll = useRef<HTMLDivElement>(null);
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
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        contentScroll.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }, [pathname]);

    const userProfileQuery = useQuery<{ avatar?: string; profile?: { avatar?: string; logo?: string } }>(
        session?.userId ? `user-profile:${session.userId}` : null,
        () => request('core', '/users/me').catch(() => ({} as { avatar?: string }))
    );
    const companyProfileQuery = useQuery<{ profile?: { logo?: string } }>(
        config.role === 'company' && session?.userId ? 'profile:company' : null,
        () => request('core', '/companies/my-company'),
    );
    const avatarUrl =
        companyProfileQuery.data?.profile?.logo ||
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
                className={`wf-page wf-role-${config.role}`}
            >
                <div
                    className={`admin-shell wf-shell wf-role-${config.role}${expanded ? " wf-menu-open" : ""}${compact ? " wf-compact" : ""}`}
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
                            <WorkspaceAccount config={config} fallbackAvatar={avatarUrl} />
                            <FrameButtonLink
                                className="wf-signin"
                                to="/auth/login"
                                onClick={() => {
                                    clearAuthSession();
                                }}
                            >
                                Đăng xuất <ArrowUpRight size={15} aria-hidden="true" />
                            </FrameButtonLink>
                        </div>
                    </header>
                    <div
                        className="wf-content-scroll"
                        ref={contentScroll}
                        onScroll={(event) => {
                            const scrollTop = event.currentTarget.scrollTop;
                            setCompact((wasCompact) => scrollTop > (wasCompact ? 0 : 24));
                        }}
                    >
                        <main className="wf-content">
                            <DataStatus />
                            {config.role === "storehouse" && <WarehousePicker />}
                            <WorkspaceOutlet scoped={config.role === "storehouse"} />
                        </main>
                    </div>
                    <DataLoadingOverlay />
                    <WorkspaceAssistant role={config.role} />
                </div>
                <WareFlowFooter />
            </div>
        </WorkspaceProvider>
    );
}
