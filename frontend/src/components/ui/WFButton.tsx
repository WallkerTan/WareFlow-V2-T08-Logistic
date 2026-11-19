import React from 'react';
import './WFButton.css';

export interface WFButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'outline' | 'primary';
}

export function WFButton({
  children,
  className = '',
  variant = 'outline',
  type = 'button',
  ...props
}: WFButtonProps) {
  return (
    <button
      type={type}
      className={`wf-btn-anim ${variant === 'primary' ? 'is-primary' : ''} ${className}`}
      {...props}
    >
      {children}
      <span aria-hidden="true" />
    </button>
  );
}

export default WFButton;
