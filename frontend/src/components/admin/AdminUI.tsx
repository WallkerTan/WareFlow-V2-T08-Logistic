import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { X } from 'lucide-react';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';

export function Badge({ label, tone }: { label: string; tone: Tone }) {
    return (
        <span className={`adm-badge adm-badge-${tone}`}>
            <i />
            {label}
        </span>
    );
}

export function Card({
    title,
    subtitle,
    action,
    children,
    bodyClassName = 'adm-card-body',
}: {
    title?: string;
    subtitle?: string;
    action?: ReactNode;
    children: ReactNode;
    bodyClassName?: string;
}) {
    return (
        <section className="adm-card">
            {title && (
                <header className="adm-card-head">
                    <div>
                        <h3>{title}</h3>
                        {subtitle && <p>{subtitle}</p>}
                    </div>
                    {action}
                </header>
            )}
            <div className={bodyClassName}>{children}</div>
        </section>
    );
}

export function StatCard({
    label,
    value,
    icon,
    tone = 'info',
    trend,
    trendDirection = 'up',
    footnote,
}: {
    label: string;
    value: string;
    icon: ReactNode;
    tone?: 'info' | 'success' | 'warning' | 'purple';
    trend?: string;
    trendDirection?: 'up' | 'down';
    footnote?: string;
}) {
    return (
        <article className="adm-stat">
            <div className="adm-stat-top">
                <span className="adm-stat-label">{label}</span>
                <span className={`adm-stat-icon ${tone === 'info' ? '' : `is-${tone}`}`}>{icon}</span>
            </div>
            <div className="adm-stat-value">{value}</div>
            <div className="adm-stat-foot">
                {trend && (
                    <span className={`adm-trend ${trendDirection === 'up' ? 'adm-trend-up' : 'adm-trend-down'}`}>
                        {trendDirection === 'up' ? '▲' : '▼'} {trend}
                    </span>
                )}
                {footnote && <span>{footnote}</span>}
            </div>
        </article>
    );
}

export function Progress({ value, tone }: { value: number; tone?: 'success' | 'warning' | 'danger' }) {
    return (
        <div className={`adm-progress ${tone ? `is-${tone}` : ''}`}>
            <i style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
        </div>
    );
}

export function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
    return (
        <div className="adm-empty">
            <span className="adm-empty-icon">{icon}</span>
            <strong>{title}</strong>
            <p>{description}</p>
        </div>
    );
}

export function Modal({
    title,
    description,
    onClose,
    children,
    footer,
}: {
    title: string;
    description?: string;
    onClose: () => void;
    children: ReactNode;
    footer?: ReactNode;
}) {
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = previous;
        };
    }, [onClose]);

    return (
        <div className="adm-modal-scrim" onClick={onClose} role="presentation">
            <div className="adm-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
                <header className="adm-modal-head">
                    <div>
                        <h3>{title}</h3>
                        {description && <p>{description}</p>}
                    </div>
                    <button className="adm-modal-close" onClick={onClose} aria-label="Đóng">
                        <X size={17} />
                    </button>
                </header>
                <div className="adm-modal-body">{children}</div>
                {footer && <footer className="adm-modal-foot">{footer}</footer>}
            </div>
        </div>
    );
}

export function Pagination({
    page,
    pageCount,
    total,
    onChange,
}: {
    page: number;
    pageCount: number;
    total: number;
    onChange: (page: number) => void;
}) {
    const pages = Array.from({ length: pageCount }, (_, index) => index + 1);
    return (
        <div className="adm-pagination">
            <span className="adm-count">
                Hiển thị <strong>{total}</strong> bản ghi
            </span>
            <div className="adm-pagination-pages">
                <button className="adm-page-btn" disabled={page === 1} onClick={() => onChange(page - 1)} aria-label="Trang trước">
                    ‹
                </button>
                {pages.map((value) => (
                    <button
                        key={value}
                        className={`adm-page-btn ${value === page ? 'is-active' : ''}`}
                        onClick={() => onChange(value)}
                        aria-current={value === page ? 'page' : undefined}
                    >
                        {value}
                    </button>
                ))}
                <button className="adm-page-btn" disabled={page === pageCount} onClick={() => onChange(page + 1)} aria-label="Trang sau">
                    ›
                </button>
            </div>
        </div>
    );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label?: string }) {
    return (
        <button
            type="button"
            className={`adm-switch ${checked ? 'is-on' : ''}`}
            onClick={() => onChange(!checked)}
            role="switch"
            aria-checked={checked}
            aria-label={label}
        />
    );
}
