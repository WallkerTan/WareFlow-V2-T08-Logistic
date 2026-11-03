import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Building2, Warehouse, ShieldCheck, Save, RotateCcw, ImagePlus, Info, LockKeyhole } from 'lucide-react';
import Button from '../ui/Button';

export type ProfileField = { name: string; label: string; placeholder?: string; type?: 'text' | 'email' | 'tel' | 'url' | 'number' | 'textarea' | 'select'; options?: { value: string; label: string }[]; required?: boolean; readOnly?: boolean; hint?: string };
export type ProfileSection = { title: string; description: string; fields: ProfileField[] };
type Props = { kind: 'company' | 'storehouse' | 'wareflow'; title: string; description: string; sections: ProfileSection[] };

export default function ProfileEditor({ kind, title, description, sections }: Props) {
    const [notice, setNotice] = useState('');
    const form = useRef<HTMLFormElement>(null);
    const Icon = kind === 'company' ? Building2 : kind === 'storehouse' ? Warehouse : ShieldCheck;
    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setNotice('Chưa kết nối dữ liệu. Thông tin chưa được gửi hoặc lưu vào hệ thống.');
    }
    function reset() {
        form.current?.reset();
        setNotice('');
    }
    return <>
        <div className="wf-page-heading"><div><span className="wf-eyebrow">THÔNG TIN & THIẾT LẬP</span><h1>{title}</h1><p>{description}</p></div><span className="wf-outline-badge">Không gian hồ sơ</span></div>
        <div className="wf-profile-banner"><div className="wf-profile-icon"><Icon size={32} /></div><div><h2>{kind === 'company' ? 'Thông tin doanh nghiệp' : kind === 'storehouse' ? 'Thông tin kho hàng' : 'Trung tâm hệ thống WareFlow'}</h2><p>Hoàn thiện hồ sơ để thông tin luôn rõ ràng, nhất quán.</p></div><span className="wf-status">Chưa có dữ liệu</span></div>
        <div className="wf-profile-grid"><form ref={form} onSubmit={submit} className="wf-profile-form">
            <section className="wf-card wf-identity"><div className="wf-section-heading"><h2>Nhận diện</h2><p>Hình ảnh đại diện cho {kind === 'company' ? 'doanh nghiệp' : kind === 'storehouse' ? 'kho hàng' : 'tài khoản quản trị'}.</p></div><div className="wf-image-placeholder"><ImagePlus size={25} /><div><strong>Chưa có hình ảnh</strong><p>Nhập đường dẫn hình ảnh trong phần thông tin bên dưới.</p></div></div></section>
            {sections.map((section, index) => <section className="wf-card" key={section.title}><div className="wf-section-heading"><span className="wf-section-number">0{index + 1}</span><div><h2>{section.title}</h2><p>{section.description}</p></div></div><div className="wf-fields">{section.fields.map(field => <label key={field.name} className={`wf-field ${field.type === 'textarea' ? 'wf-field-wide' : ''}`}><span>{field.label}{field.required && <b> *</b>}{field.readOnly && <LockKeyhole size={12} />}</span>{field.type === 'textarea' ? <textarea name={field.name} rows={4} placeholder={field.placeholder} maxLength={2000} /> : field.type === 'select' ? <select name={field.name} defaultValue="" required={field.required}><option value="" disabled>Chọn {field.label.toLowerCase()}</option>{field.options?.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select> : <input name={field.name} type={field.type || 'text'} placeholder={field.placeholder || (field.readOnly ? 'Chưa có dữ liệu' : `Nhập ${field.label.toLowerCase()}`)} required={field.required} readOnly={field.readOnly} min={field.type === 'number' ? 0 : undefined} step={field.type === 'number' ? 'any' : undefined} maxLength={255} pattern={field.required && (!field.type || field.type === 'text') ? '.*\\S.*' : undefined} />}{field.hint && <small>{field.hint}</small>}</label>)}</div></section>)}
            {notice && <div className="wf-notice" role="status"><Info size={19} />{notice}</div>}
            <div className="wf-form-actions"><span>Kiểm tra thông tin trước khi xác nhận.</span><div><Button variant="secondary" onClick={reset}><RotateCcw size={16} />Đặt lại</Button><Button type="submit"><Save size={16} />Lưu thay đổi</Button></div></div>
        </form><aside className="wf-profile-aside"><section className="wf-card"><span className="wf-aside-icon"><ShieldCheck size={23} /></span><h3>Hồ sơ đầy đủ,<br />vận hành liền mạch.</h3><p>Thông tin hồ sơ giúp nhận diện đúng đơn vị và người phụ trách trong toàn bộ quá trình quản lý.</p><hr /><div className="wf-help-row"><Info size={17} /><span>Các trường có dấu <b>*</b> là thông tin bắt buộc.</span></div><div className="wf-help-row"><LockKeyhole size={17} /><span>Mã định danh, trạng thái và thời gian tạo do hệ thống quản lý.</span></div></section><div className="wf-preview-note">Bản giao diện • Chưa kết nối dữ liệu<br />Nội dung nhập chỉ tồn tại trên trang hiện tại.</div></aside></div>
    </>;
}
