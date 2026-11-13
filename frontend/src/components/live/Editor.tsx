import { useState } from 'react';
import type { Dispatch, SetStateAction, ReactNode } from 'react';
import { Modal } from '../admin/AdminUI';
import { request, text } from '../../services/api';
import type { Row } from '../../services/api';
import { Notice } from './UI';
export type Option = { value: string; label: string };
export type Field = { name: string; label: string; type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'month' | 'textarea' | 'select' | 'image' | 'images'; required?: boolean; options?: Option[]; min?: number; step?: string; hint?: string; readOnly?: boolean; defaultValue?: string; minLength?: number; folder?: string };
export type Values = Record<string, string>;
export function ImageUpload({ value, onChange, folder = 'products', onUploadingChange }: { value: string; onChange: (url: string) => void; folder?: string; onUploadingChange?: (delta: number) => void }) {
    const [busy, setBusy] = useState(false); const [error, setError] = useState('');
    return <div className="live-upload">{value && <img src={value} alt="Ảnh đã tải lên" />}<input aria-label="Chọn ảnh tải lên" type="file" accept="image/png,image/jpeg,image/gif,image/webp" disabled={busy} onChange={async e => {
        const file = e.target.files?.[0]; if (!file) return; e.target.value = '';
        if (file.size > 10 * 1024 * 1024) { setError('Ảnh tối đa 10MB.'); return; }
        setBusy(true); onUploadingChange?.(1); setError(''); const body = new FormData(); body.append('file', file); body.append('folder', folder);
        try { const result = await request<{ secureUrl: string }>('core', '/upload/image', { method: 'POST', body }); onChange(result.secureUrl); }
        catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tải được ảnh.'); } finally { setBusy(false); onUploadingChange?.(-1); }
    }} />{value && <button type="button" className="adm-btn" disabled={busy} onClick={() => onChange('')}>Bỏ ảnh</button>}{busy && <span role="status">Đang tải ảnh…</span>}{error && <Notice error>{error}</Notice>}</div>;
}
function ImageGallery({ value, onChange, folder, onUploadingChange }: { value: string; onChange: (value: string) => void; folder?: string; onUploadingChange?: (delta: number) => void }) {
    const images: string[] = (() => { try { const data: unknown = JSON.parse(value || '[]'); return Array.isArray(data) ? data.filter((item): item is string => typeof item === 'string') : []; } catch { return []; } })();
    const [uploading, setUploading] = useState(false);
    return <div><div className="live-gallery">{images.map((url, index) => <div key={`${url}-${index}`}><img className="live-thumbnail" src={url} alt={`Ảnh ${index + 1}`} /><button type="button" className="adm-btn" disabled={uploading} onClick={() => onChange(JSON.stringify(images.filter((_, i) => i !== index)))}>Bỏ ảnh</button></div>)}</div><ImageUpload value="" folder={folder} onUploadingChange={delta => { setUploading(delta > 0); onUploadingChange?.(delta); }} onChange={url => { if (url) onChange(JSON.stringify([...images, url])); }} /></div>;
}
export function Fields({ fields, values, setValues, onUploadingChange }: { fields: Field[]; values: Values; setValues: Dispatch<SetStateAction<Values>>; onUploadingChange?: (delta: number) => void }) {
    return <div className="live-fields">{fields.map(field => <label key={field.name}><span>{field.label}{field.required ? ' *' : ''}</span>
        {field.type === 'select' ? <select name={field.name} required={field.required} value={values[field.name] || ''} onChange={e => setValues(previous => ({ ...previous, [field.name]: e.target.value }))}><option value="">Chọn…</option>{field.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
            : field.type === 'textarea' ? <textarea name={field.name} required={field.required} value={values[field.name] || ''} onChange={e => setValues(previous => ({ ...previous, [field.name]: e.target.value }))} />
                : field.type === 'images' ? <ImageGallery value={values[field.name] || '[]'} onChange={value => setValues(previous => ({ ...previous, [field.name]: value }))} folder={field.folder} onUploadingChange={onUploadingChange} />
                    : field.type === 'image' ? <ImageUpload value={values[field.name] || ''} onChange={url => setValues(previous => ({ ...previous, [field.name]: url }))} folder={field.folder || (field.name === 'avatar' ? 'avatars' : field.name === 'logo' ? 'companies' : 'products')} onUploadingChange={onUploadingChange} />
                        : <input type={field.type || 'text'} name={field.name} required={field.required} value={values[field.name] || ''} min={field.min} minLength={field.minLength} step={field.step || (field.type === 'number' ? '0.01' : undefined)} readOnly={field.readOnly} onChange={e => setValues(previous => ({ ...previous, [field.name]: e.target.value }))} />}
        {field.hint && <small>{field.hint}</small>}</label>)}</div>;
}
function initialValues(fields: Field[], initial: Row = {}): Values { return Object.fromEntries(fields.map(f => [f.name, initial[f.name] == null || initial[f.name] === '' ? f.defaultValue || '' : text(initial[f.name])])); }
export default function Editor({ title, fields, initial, onSave, onClose, description }: { description?: ReactNode; title: string; fields: Field[]; initial?: Row; onSave: (values: Values) => Promise<unknown>; onClose: () => void }) {
    const [values, setValues] = useState(() => initialValues(fields, initial));
    const [original]=useState(()=>JSON.stringify(initialValues(fields,initial)));const [discarding,setDiscarding]=useState(false);
    const [pending, setPending] = useState(false); const [error, setError] = useState('');
    const [uploads, setUploads] = useState(0);
    function requestClose(){if(pending||uploads>0)return;if(JSON.stringify(values)!==original)setDiscarding(true);else onClose();}
    return <Modal title={title} onClose={requestClose}>{description&&<div className="live-form-guide">{description}</div>}{discarding&&<div className="live-discard" role="alert"><p>Biểu mẫu có thay đổi chưa lưu.</p><div className="live-actions"><button type="button" className="adm-btn" onClick={()=>setDiscarding(false)}>Tiếp tục sửa</button><button type="button" className="adm-btn adm-btn-danger" onClick={onClose}>Bỏ thay đổi</button></div></div>}<form onSubmit={async e => {
        e.preventDefault(); if (pending || uploads > 0) return; setPending(true); setError('');
        try { await onSave(values); onClose(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không lưu được dữ liệu.'); } finally { setPending(false); }
    }}><fieldset disabled={pending}><Fields fields={fields} values={values} setValues={setValues} onUploadingChange={delta => setUploads(previous => previous + delta)} />{error && <Notice error>{error}</Notice>}<div className="live-actions live-form-actions"><button type="button" className="adm-btn" disabled={uploads > 0} onClick={requestClose}>Hủy</button><button className="adm-btn adm-btn-primary" type="submit" disabled={uploads > 0}>{uploads > 0 ? 'Đang tải ảnh…' : pending ? 'Đang lưu…' : 'Lưu'}</button></div></fieldset></form></Modal>;
}
