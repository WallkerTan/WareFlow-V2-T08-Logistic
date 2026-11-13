import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
    const panel = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null; const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        (panel.current?.querySelector<HTMLElement>('input:not([disabled]),select:not([disabled]),textarea:not([disabled])')||panel.current?.querySelector<HTMLElement>('button'))?.focus();
        return () => { document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus(); };
    }, []);
    useEffect(() => {
        function onKey(event: KeyboardEvent) {
            if (event.key === 'Escape') onClose();
            if (event.key !== 'Tab') return;
            const focusable = panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]');
            if (!focusable?.length) return;
            const first = focusable[0], last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
        document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);
    return <div className="adm-modal-scrim" onClick={onClose}><div ref={panel} className="adm-modal" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}><header className="adm-modal-head"><h3>{title}</h3><button className="adm-modal-close" type="button" onClick={onClose} aria-label="Đóng"><X size={17} /></button></header><div className="adm-modal-body">{children}</div></div></div>;
}
