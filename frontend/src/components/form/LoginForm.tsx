import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import AuthField from './AuthField';
import { authApi } from '../../services/authApi';

export type LoginValues = { email: string; password: string; remember: boolean };
type Props = { onSubmit?: (values: LoginValues) => Promise<void> };

export default function LoginForm({ onSubmit = authApi.login }: Props) {
    'use no memo';
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({ defaultValues: { email: '', password: '', remember: false } });
    const [message, setMessage] = useState('');
    const [success, setSuccess] = useState(false);
    async function submit(values: LoginValues) {
        setMessage('');
        setSuccess(false);
        try {
            await onSubmit(values);
            setSuccess(true);
            setMessage('Đăng nhập thành công. Phiên làm việc đã được máy chủ xác nhận.');
        } catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể đăng nhập. Vui lòng thử lại.'); }
    }
    return <form className="auth-form" onSubmit={handleSubmit(submit)} noValidate>
        <AuthField id="email" label="Email công việc" type="email" autoComplete="username" placeholder="ban@congty.vn" required {...register('email', { required: 'Vui lòng nhập email.', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email không hợp lệ.' } })} error={errors.email?.message} />
        <AuthField id="password" label="Mật khẩu" type="password" autoComplete="current-password" placeholder="Nhập mật khẩu của bạn" required {...register('password', { required: 'Vui lòng nhập mật khẩu.' })} error={errors.password?.message} />
        <label className="auth-checkbox"><input type="checkbox" {...register('remember')} /> Ghi nhớ đăng nhập</label>
        {message && <div className={`auth-notice ${success ? 'auth-notice-success' : 'auth-notice-error'}`} role={success ? 'status' : 'alert'}>{message}</div>}
        <button className="auth-submit" disabled={isSubmitting}>{isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}<ArrowRight size={18} /></button>
        <p className="auth-switch">Chưa có tài khoản? <Link to="/auth/register">Đăng ký công ty</Link></p>
        <div className="auth-security"><ShieldCheck size={16} /> Không gian làm việc dành riêng cho doanh nghiệp</div>
    </form>;
}
