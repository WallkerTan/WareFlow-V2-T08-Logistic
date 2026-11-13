import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useApi } from '../../hook/useApi';
import { useWorkspace } from './workspaceContext';
export default function NotificationBell() {
    const { session } = useWorkspace();
    const unread = useApi<number>('core', '/notifications/unread-count');
    const { reload } = unread;
    useEffect(() => {
        const refresh = () => { if (!document.hidden) reload(); };
        window.addEventListener('wareflow.notifications', refresh);
        document.addEventListener('visibilitychange', refresh);
        const timer = window.setInterval(refresh, 60000);
        return () => { clearInterval(timer); window.removeEventListener('wareflow.notifications', refresh); document.removeEventListener('visibilitychange', refresh); };
    }, [reload]);
    const base = session.role === 'SYSTEM_ADMIN' ? '/admin' : session.role === 'COMPANY_ADMIN' ? '/company' : '/storehouse';
    return <Link className="live-notification-bell" to={`${base}/notifications`} aria-label={unread.error ? 'Mở thông báo' : `Thông báo, ${unread.data || 0} chưa đọc`} title={unread.error || 'Thông báo'}><Bell size={20} />{!!unread.data && <span>{unread.data > 99 ? '99+' : unread.data}</span>}</Link>;
}
