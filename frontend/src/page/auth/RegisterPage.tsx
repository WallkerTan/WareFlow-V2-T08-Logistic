import RegisterForm from '../../components/form/RegisterForm';
import { authApi } from '../../services/authApi';
import { useOutletContext } from 'react-router-dom';
import type { AuthEmailState } from '../../layout/auth/AuthLayout';

export default function RegisterPage() {
    const emailState = useOutletContext<AuthEmailState>();
    if (emailState === 'loading') return <p role="status">Đang tải cấu hình đăng ký…</p>;
    if (emailState === 'error') return <p role="alert">Không tải được cấu hình đăng ký.</p>;
    return <RegisterForm onSubmit={authApi.registerCompany} emailEnabled={emailState === true} />;
}

