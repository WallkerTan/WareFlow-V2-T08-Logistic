import { useEffect, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { expireSessionAt, getAuthSession, roleHome, sessionSnapshot, subscribeSession } from '../../services/session';
import type { Role } from '../../services/session';
import WorkspaceProvider from './WorkspaceProvider';
export default function RoleGuard({ role, children }: { role: Role; children: ReactNode }) {
    const raw = useSyncExternalStore(subscribeSession, sessionSnapshot, () => null); const location = useLocation();
    const session = getAuthSession();
    const expiresAt = session?.expiresAt;
    useEffect(() => {
        if (!expiresAt) return;
        return expireSessionAt(expiresAt);
    }, [expiresAt, raw]);
    if (!session) return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />;
    if (session.role !== role) return <Navigate to={roleHome(session.role)} replace />;
    return <WorkspaceProvider key={session.userId} session={session}>{children}</WorkspaceProvider>;
}
