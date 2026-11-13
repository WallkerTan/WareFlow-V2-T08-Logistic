import { useState } from 'react';
import type { ReactNode } from 'react';
import { Check, AlertTriangle } from 'lucide-react';
import { Modal } from '../admin/AdminUI';
import { Notice } from './UI';

export function Details({ items }: { items: { label: string; value: ReactNode }[] }) {
    return <dl className="live-details">{items.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value ?? '—'}</dd></div>)}</dl>;
}
export function PhotoGallery({ images, title = 'Hình ảnh' }: { images: string[]; title?: string }) {
    const [selected, setSelected] = useState('');
    const current = images.includes(selected) ? selected : images[0];
    if (!images.length) return <p className="live-muted">Chưa có hình ảnh.</p>;
    return <section className="live-photo-gallery" aria-label={title}><img className="live-photo-main" src={current} alt={title} /><div className="live-photo-strip">{images.map((url, index) => <button key={`${url}-${index}`} type="button" aria-label={`Xem ảnh ${index + 1}`} aria-pressed={url === current} onClick={() => setSelected(url)}><img src={url} alt={`Ảnh ${index + 1}`} /></button>)}</div></section>;
}
export function Workflow({ steps }: { steps: { label: string; done: boolean; description?: string }[] }) {
    const current = steps.findIndex(step => !step.done);
    return <ol className="live-workflow" aria-label="Tiến độ xử lý">{steps.map((step, index) => <li key={step.label} className={step.done ? 'is-done' : index === current ? 'is-current' : ''} aria-current={index === current ? 'step' : undefined}><span>{step.done ? <Check size={15} /> : index + 1}</span><div><strong>{step.label}</strong>{step.description && <small>{step.description}</small>}</div></li>)}</ol>;
}
export function ConfirmDialog({ title, children, confirmLabel = 'Xác nhận', onConfirm, onClose }: { title: string; children: ReactNode; confirmLabel?: string; onConfirm: () => Promise<unknown>; onClose: () => void }) {
    const [pending, setPending] = useState(false); const [error, setError] = useState('');
    return <Modal title={title} onClose={() => { if (!pending) onClose(); }}><div className="live-confirm"><AlertTriangle size={27} /><div>{children}</div></div>{error && <Notice error>{error}</Notice>}<div className="live-actions live-form-actions"><button className="adm-btn" disabled={pending} onClick={onClose}>Quay lại</button><button className="adm-btn adm-btn-danger" disabled={pending} onClick={async () => { if (pending) return; setPending(true); setError(''); try { await onConfirm(); onClose(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thực hiện được thao tác.'); } finally { setPending(false); } }}>{pending ? 'Đang xử lý…' : confirmLabel}</button></div></Modal>;
}
