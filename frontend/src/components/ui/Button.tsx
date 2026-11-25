/*
 * From Uiverse.io by mrhyddenn - https://uiverse.io/mrhyddenn/tricky-baboon-12
 * MIT License, Copyright (c) mrhyddenn
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import './button-frame.css';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'frame' };
function FrameContent({ children }: { children: ReactNode }) {
    return <span className="wf-button-frame__inner">
        <span className="wf-button-frame__slide" aria-hidden="true" />
        <span className="wf-button-frame__text">{children}</span>
    </span>;
}

export function FrameButtonLink({ className = '', children, ...props }: LinkProps) {
    return <Link className={`wf-button-frame ${className}`} {...props}><FrameContent>{children}</FrameContent></Link>;
}

export default function Button({ variant = 'primary', className = '', type = 'button', children, ...props }: Props) {
    if (variant === 'frame') {
        return <button type={type} className={`wf-button-frame ${className}`} {...props}><FrameContent>{children}</FrameContent></button>;
    }
    return <button type={type} className={`wf-button wf-button-${variant} ${className}`} {...props}>{children}</button>;
}
