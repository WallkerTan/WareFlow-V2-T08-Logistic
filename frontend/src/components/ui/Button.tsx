import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' };
export default function Button({ variant = 'primary', className = '', type = 'button', ...props }: Props) {
    return <button type={type} className={`wf-button wf-button-${variant} ${className}`} {...props} />;
}
