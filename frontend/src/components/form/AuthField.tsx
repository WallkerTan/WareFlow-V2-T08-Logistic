import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string };

export default function AuthField({ label, error, id, type = 'text', ...props }: Props) {
    const [visible, setVisible] = useState(false);
    const password = type === 'password';
    return <div className="auth-field">
        <label htmlFor={id}>{label}{props.required && <span className="required"> *</span>}</label>
        <div className="auth-input-wrap">
            <input {...props} id={id} type={password && visible ? 'text' : type} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} className={password ? 'password-input' : ''} />
            {password && <button type="button" className="password-toggle" onClick={() => setVisible(!visible)} aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>}
        </div>
        {error && <span className="field-error" id={`${id}-error`}>{error}</span>}
    </div>;
}
