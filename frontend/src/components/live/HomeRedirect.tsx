import { Navigate } from 'react-router-dom';
import { getAuthSession, roleHome } from '../../services/session';
export default function HomeRedirect() { const session = getAuthSession(); return <Navigate to={session ? roleHome(session.role) : '/auth/login'} replace />; }
