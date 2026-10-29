import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, Menu, Search, Settings, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { notifications } from '../../data/adminData';
import { formatRelativeTime } from '../../utils/format';
import { adminNavGroups } from './adminNav';
import './admin.css';

const pageTitles: Record<string, string> = {
    '/admin': 'Bảng điều khiển',
    '/admin/companies': 'Quản lý công ty',
    '/admin/users': 'Quản lý người dùng',
    '/admin/warehouses': 'Quản lý kho hàng',
    '/admin/suppliers': 'Nhà cung cấp',
    '/admin/products': 'Danh mục sản phẩm',
    '/admin/inventory': 'Chứng từ kho',
    '/admin/shipments': 'Vận chuyển',
    '/admin/finance': 'Tài chính',
    '/admin/notifications': 'Trung tâm thông báo',
    '/admin/logs': 'Nhật ký hệ thống',
    '/admin/settings': 'Cài đặt hệ thống',
};

export default function AdminLayout() {
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const unread = notifications.filter((item) => !item.isRead);

    // Close every transient panel when the route changes. Adjusting state
    // during render (rather than in an effect) avoids a cascading re-render.
    const [lastPath, setLastPath] = useState(location.pathname);
    if (lastPath !== location.pathname) {
        setLastPath(location.pathname);
        setSidebarOpen(false);
        setNotificationOpen(false);
        setProfileOpen(false);
    }

    useEffect(() => {
        document.body.style.overflow = sidebarOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [sidebarOpen]);

    const title = pageTitles[location.pathname] ?? 'Quản trị hệ thống';

    return (
        <div className="admin-shell">
            {sidebarOpen && <div className="admin-scrim" onClick={() => setSidebarOpen(false)} aria-hidden="true" />}

            <aside className={`admin-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
                <div className="admin-sidebar-head">
                    <NavLink to="/admin" className="admin-brand" aria-label="WareFlow quản trị">
                        <span className="admin-brand-mark">W</span>
                        <span className="admin-brand-text">
                            ware<span>flow</span>
                        </span>
                    </NavLink>
                    <button className="admin-sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Đóng menu">
                        <X size={18} />
                    </button>
                </div>

                <nav className="admin-nav" aria-label="Điều hướng quản trị">
                    {adminNavGroups.map((group) => (
                        <div className="admin-nav-group" key={group.label}>
                            <span className="admin-nav-group-label">{group.label}</span>
                            {group.items.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={'end' in item ? item.end : false}
                                    className={({ isActive }) => `admin-nav-link ${isActive ? 'is-active' : ''}`}
                                >
                                    <item.icon size={17} />
                                    <span>{item.label}</span>
                                    {item.to === '/admin/notifications' && unread.length > 0 && (
                                        <em className="admin-nav-badge">{unread.length}</em>
                                    )}
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="admin-sidebar-foot">
                    <div className="admin-plan-card">
                        <span className="admin-plan-label">Gói doanh nghiệp</span>
                        <strong>82% dung lượng</strong>
                        <div className="admin-plan-bar">
                            <i style={{ width: '82%' }} />
                        </div>
                        <small>8.2 GB / 10 GB đã dùng</small>
                    </div>
                </div>
            </aside>

            <div className="admin-main">
                <header className="admin-topbar">
                    <button className="admin-icon-btn admin-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Mở menu">
                        <Menu size={19} />
                    </button>

                    <div className="admin-topbar-title">
                        <h1>{title}</h1>
                        <span className="admin-topbar-crumb">WAREFLOW / QUẢN TRỊ</span>
                    </div>

                    <div className="admin-search">
                        <Search size={16} />
                        <input type="search" placeholder="Tìm kiếm công ty, kho, đơn hàng…" aria-label="Tìm kiếm" />
                        <kbd>⌘K</kbd>
                    </div>

                    <div className="admin-topbar-actions">
                        <div className="admin-popover-wrap">
                            <button
                                className="admin-icon-btn"
                                onClick={() => {
                                    setNotificationOpen((open) => !open);
                                    setProfileOpen(false);
                                }}
                                aria-label={`Thông báo, ${unread.length} chưa đọc`}
                                aria-expanded={notificationOpen}
                            >
                                <Bell size={18} />
                                {unread.length > 0 && <i className="admin-dot" />}
                            </button>

                            {notificationOpen && (
                                <div className="admin-popover admin-popover-wide">
                                    <header>
                                        <strong>Thông báo</strong>
                                        <span>{unread.length} chưa đọc</span>
                                    </header>
                                    <ul className="admin-notif-list">
                                        {notifications.slice(0, 4).map((item) => (
                                            <li key={item.id} className={item.isRead ? '' : 'is-unread'}>
                                                <i className="admin-notif-dot" />
                                                <div>
                                                    <strong>{item.title}</strong>
                                                    <p>{item.body}</p>
                                                    <small>{formatRelativeTime(item.createdAt)}</small>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                    <NavLink to="/admin/notifications" className="admin-popover-foot">
                                        Xem tất cả thông báo
                                    </NavLink>
                                </div>
                            )}
                        </div>

                        <div className="admin-popover-wrap">
                            <button
                                className="admin-profile-btn"
                                onClick={() => {
                                    setProfileOpen((open) => !open);
                                    setNotificationOpen(false);
                                }}
                                aria-expanded={profileOpen}
                            >
                                <span className="admin-avatar admin-avatar-sm">NA</span>
                                <span className="admin-profile-meta">
                                    <strong>Nguyễn Văn An</strong>
                                    <small>Quản trị hệ thống</small>
                                </span>
                                <ChevronDown size={15} />
                            </button>

                            {profileOpen && (
                                <div className="admin-popover admin-popover-menu">
                                    <div className="admin-popover-user">
                                        <span className="admin-avatar">NA</span>
                                        <div>
                                            <strong>Nguyễn Văn An</strong>
                                            <small>admin@wareflow.vn</small>
                                        </div>
                                    </div>
                                    <NavLink to="/admin/settings" className="admin-menu-item">
                                        <Settings size={15} /> Cài đặt
                                    </NavLink>
                                    <NavLink to="/auth/login" className="admin-menu-item admin-menu-item-danger">
                                        <LogOut size={15} /> Đăng xuất
                                    </NavLink>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <main className="admin-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
