import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

let modalCount = 0;
let overflowBeforeModal = '';

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
    wide = false,
}: {
    title: string;
    description?: string;
    onClose: () => void;
    children: ReactNode;
    footer?: ReactNode;
    wide?: boolean;
}) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const closeRef = useRef(onClose);

    useEffect(() => { closeRef.current = onClose; }, [onClose]);
    useEffect(() => {
        const dialog = dialogRef.current;
        const opener = document.activeElement;
        if (modalCount === 0) overflowBeforeModal = document.body.style.overflow;
        modalCount++;
        document.body.style.overflow = 'hidden';
        dialog?.focus({ preventScroll: true });

        const onKey = (event: KeyboardEvent) => {
            const dialogs = document.querySelectorAll('.adm-modal');
            if (!dialog || dialogs[dialogs.length - 1] !== dialog) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                closeRef.current();
                return;
            }
            if (event.key !== 'Tab') return;
            const items = Array.from(dialog.querySelectorAll<HTMLElement>(
                'a[href], button, input, select, textarea, [tabindex="0"]',
            )).filter(item => !item.matches(':disabled') && item.getClientRects().length > 0);
            const first = items[0];
            const last = items.at(-1);
            if (!first || !last) {
                event.preventDefault();
            } else if (document.activeElement === dialog || !dialog.contains(document.activeElement) ||
                (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
                event.preventDefault();
                (event.shiftKey ? last : first).focus();
            }
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            modalCount--;
            if (modalCount === 0) document.body.style.overflow = overflowBeforeModal;
            if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
        };
    }, []);

    const modalContent = (
        <div className="adm-modal-scrim" onClick={onClose} role="presentation">
            <div ref={dialogRef} tabIndex={-1} className={wide ? "adm-modal adm-modal-wide" : "adm-modal"} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
                <header className="adm-modal-head">
                    <div>
                        <h3>{title}</h3>
                        {description && <p>{description}</p>}
                    </div>
                    <button type="button" className="adm-modal-close" onClick={onClose} aria-label="Đóng">
                        <X size={17} />
                    </button>
                </header>
                <div className="adm-modal-body">{children}</div>
                {footer && <footer className="adm-modal-foot">{footer}</footer>}
            </div>
        </div>
    );
    return createPortal(modalContent, document.body);
}

export function getPaginationItems(page: number, pageCount: number): (number | '...')[] {
    if (pageCount <= 5) {
        return Array.from({ length: pageCount }, (_, index) => index + 1);
    }
    const pages = new Set<number>();
    // 2 trang đầu
    pages.add(1);
    pages.add(2);
    // Ở giữa là trang hiện tại (kèm lân cận nếu có)
    if (page - 1 >= 1) pages.add(page - 1);
    pages.add(page);
    if (page + 1 <= pageCount) pages.add(page + 1);
    // 2 trang cuối
    pages.add(pageCount - 1);
    pages.add(pageCount);

    const sorted = Array.from(pages).sort((a, b) => a - b);
    const result: (number | '...')[] = [];

    for (let i = 0; i < sorted.length; i++) {
        if (i > 0) {
            const diff = sorted[i] - sorted[i - 1];
            if (diff === 2) {
                result.push(sorted[i - 1] + 1);
            } else if (diff > 2) {
                result.push('...');
            }
        }
        result.push(sorted[i]);
    }
    return result;
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
    const items = getPaginationItems(page, pageCount);
    return (
        <div className="adm-pagination">
            <span className="adm-count">
                Hiển thị <strong>{total}</strong> bản ghi
            </span>
            <div className="adm-pagination-pages">
                <button type="button" className="adm-page-btn" disabled={page === 1} onClick={() => onChange(page - 1)} aria-label="Trang trước">
                    ‹
                </button>
                {items.map((item, index) =>
                    item === '...' ? (
                        <span key={`dots-${index}`} className="adm-page-ellipsis">
                            …
                        </span>
                    ) : (
                        <button
                            key={item}
                            type="button"
                            className={`adm-page-btn ${item === page ? 'is-active' : ''}`}
                            onClick={() => onChange(item)}
                            aria-current={item === page ? 'page' : undefined}
                        >
                            {item}
                        </button>
                    )
                )}
                <button type="button" className="adm-page-btn" disabled={page === pageCount} onClick={() => onChange(page + 1)} aria-label="Trang sau">
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
