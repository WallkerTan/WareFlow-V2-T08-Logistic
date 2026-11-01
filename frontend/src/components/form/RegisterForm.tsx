import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import AuthField from './AuthField';

export type RegisterValues = { companyName: string; taxCode: string; fullName: string; phone: string; email: string; password: string; confirmPassword: string; accepted: boolean };
type Props = { onSubmit?: (values: RegisterValues) => Promise<void> };

export default function RegisterForm({ onSubmit }: Props) {
    'use no memo';
    const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<RegisterValues>({
        defaultValues: { companyName: '', taxCode: '', fullName: '', phone: '', email: '', password: '', confirmPassword: '', accepted: false },
    });
    const [message, setMessage] = useState('');
    const [success, setSuccess] = useState(false);
    async function submit(values: RegisterValues) {
        setMessage('');
        setSuccess(false);
        try {
            if (onSubmit) { await onSubmit(values); setSuccess(true); setMessage('Yêu cầu đã được xử lý.'); }
            else setMessage('Đây là bản giao diện. Chưa gửi yêu cầu đăng ký công ty đến máy chủ.');
        } catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể xử lý yêu cầu.'); }
    }
    return <form className="auth-form register-form" onSubmit={handleSubmit(submit)} noValidate>
        <div className="form-section-label"><span>01</span> Thông tin doanh nghiệp</div>
        <AuthField id="companyName" label="Tên công ty" autoComplete="organization" placeholder="Công ty TNHH của bạn" required {...register('companyName', { validate: v => !!v?.trim() || 'Vui lòng nhập tên công ty.' })} error={errors.companyName?.message} />
        <AuthField id="taxCode" label="Mã số thuế" placeholder="Nhập mã số thuế doanh nghiệp" required {...register('taxCode', { required: 'Vui lòng nhập mã số thuế.', pattern: { value: /^\d{10}(-?\d{3})?$/, message: 'Mã số thuế gồm 10 hoặc 13 chữ số.' } })} error={errors.taxCode?.message} />
        <div className="form-section-label"><span>02</span> Tài khoản quản trị</div>
        <div className="auth-field-row">
            <AuthField id="fullName" label="Họ và tên" autoComplete="name" placeholder="Nguyễn Văn An" required {...register('fullName', { validate: v => !!v?.trim() || 'Vui lòng nhập họ tên.' })} error={errors.fullName?.message} />
            <AuthField id="phone" label="Số điện thoại" type="tel" autoComplete="tel" placeholder="0901 234 567" required {...register('phone', { required: 'Vui lòng nhập số điện thoại.', validate: v => /^(0\d{9}|\+84\d{9})$/.test(v.replace(/[\s.-]/g, '')) || 'Số điện thoại Việt Nam không hợp lệ.' })} error={errors.phone?.message} />
        </div>
        <AuthField id="email" label="Email công việc" type="email" autoComplete="email" placeholder="ban@congty.vn" required {...register('email', { required: 'Vui lòng nhập email.', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email không hợp lệ.' } })} error={errors.email?.message} />
        <div className="auth-field-row">
            <AuthField id="password" label="Mật khẩu" type="password" autoComplete="new-password" placeholder="Ít nhất 8 ký tự" required {...register('password', { required: 'Vui lòng nhập mật khẩu.', minLength: { value: 8, message: 'Mật khẩu cần ít nhất 8 ký tự.' } })} error={errors.password?.message} />
            <AuthField id="confirmPassword" label="Xác nhận mật khẩu" type="password" autoComplete="new-password" placeholder="Nhập lại mật khẩu" required {...register('confirmPassword', { required: 'Vui lòng xác nhận mật khẩu.', validate: v => v === getValues('password') || 'Mật khẩu xác nhận chưa khớp.' })} error={errors.confirmPassword?.message} />
        </div>
        <label className="auth-checkbox"><input type="checkbox" {...register('accepted', { required: 'Vui lòng xác nhận bạn được phép đăng ký công ty.' })} /> Tôi xác nhận có quyền tạo và quản trị không gian làm việc cho công ty này.</label>
        {errors.accepted && <span className="field-error" role="alert">{errors.accepted.message}</span>}
        {message && <div className={`auth-notice ${success ? 'auth-notice-success' : 'auth-notice-error'}`} role={success ? 'status' : 'alert'}>{message}</div>}
        <button className="auth-submit" disabled={isSubmitting}>{isSubmitting ? 'Đang tạo tài khoản…' : 'Tạo tài khoản công ty'}<ArrowRight size={18} /></button>
        <p className="auth-switch">Đã có tài khoản? <Link to="/auth/login">Đăng nhập</Link></p>
        <div className="auth-security"><ShieldCheck size={16} /> Khởi đầu hành trình vận hành kho thông minh</div>
    </form>;
}
