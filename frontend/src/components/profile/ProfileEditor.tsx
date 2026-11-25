import { request, object } from '../../services/api';
import type { Row } from '../../services/api';
import { useQuery } from '../../services/query';
import { useWorkspace } from '../../services/workspace';
import { saveResource } from '../../services/data';
import { uploadImage } from '../../data/warehouses';
import { ImageCropInput, imageSizes } from '../common/ImageCropInput';
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import {
    Building2,
    Warehouse,
    ShieldCheck,
    Save,
    RotateCcw,
    ImagePlus,
    Info,
    LockKeyhole,
} from "lucide-react";
import Button from "../ui/Button";
import { Modal } from "../admin/AdminUI";

export type ProfileField = {
    name: string;
    label: string;
    placeholder?: string;
    type?: "text" | "email" | "tel" | "url" | "number" | "textarea" | "select";
    options?: { value: string; label: string }[];
    required?: boolean;
    readOnly?: boolean;
    hint?: string;
};
export type ProfileSection = {
    title: string;
    description: string;
    fields: ProfileField[];
};
type Props = {
    kind: "company" | "storehouse" | "wareflow";
    title: string;
    description: string;
    sections: ProfileSection[];
};

export default function ProfileEditor({
    kind,
    title,
    description,
    sections,
}: Props) {
    const [notice, setNotice] = useState("");
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const form = useRef<HTMLFormElement>(null);
    const Icon =
        kind === "company"
            ? Building2
            : kind === "storehouse"
              ? Warehouse
              : ShieldCheck;
    const scope=useWorkspace();
    const resource=useQuery<Row>(kind==='storehouse'?null:'profile:'+kind,()=>request('core',kind==='company'?'/companies/my-company':'/users/me'));
    const source=kind==='storehouse'?scope.warehouse:resource.data;
    const [draft,setDraft]=useState<{id:unknown;values:Record<string,string>}|null>(null);
    const [busy,setBusy]=useState(false);
    function initialValues(row:Row|undefined) {const data=row||{};const aliases:Record<string,string>={'full_name':'fullName','business_model':'businessModel','warehouse_type':'warehouseType','owner_company_id':'ownerCompanyId','created_at':'createdAt','profile.tax_code':'profile.taxCode','handover.employee':'handover.managerName','handover.time':object(data.handover).handoverTime ? 'handover.handoverTime' : 'handover.handedOverAt'};return Object.fromEntries(sections.flatMap(s=>s.fields).map(field=>{const path=(aliases[field.name]||field.name).split('.');const value=path.reduce<unknown>((v,k)=>object(v)[k],data);return [field.name,field.name==='business_model'?String(value||'').toLowerCase():String(value||'')];}));}
    const values = {...initialValues(source), ...(draft?.id===source?.id?draft?.values:{})};
    const avatarUrl = values.avatar || values['profile.logo'];
    function update(name:string,value:string){setDraft(previous=>({id:source?.id,values:{...(previous?.id===source?.id?previous?.values:{}),[name]:value}}));}
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();if(!source||busy)return;setBusy(true);setNotice('');
        try {
            const body = kind === 'company'
                ? { name: values.name, businessModel: values.business_model.toUpperCase(),
                    taxCode: values['profile.tax_code'], logo: values['profile.logo'],
                    address: values['profile.address'], description: values['profile.description'] }
                : kind === 'storehouse'
                    ? { name: values.name, address: values.address, avatar: values.avatar.trim() }
                    : { fullName: values.full_name, avatar: values.avatar?.trim() || null,
                        profile: { phone: values['profile.phone'], address: values['profile.address'] } };
            const saved = await saveResource('core',kind==='company'?'/companies/'+source.id:kind==='storehouse'?'/warehouses/'+source.id+'/profile':'/users/me','PUT',body);
            if (kind === 'storehouse') {
                const warehouse = object(saved);
                if (warehouse.id !== source.id || !('avatar' in warehouse)
                    || (warehouse.avatar ?? '') !== values.avatar.trim()) {
                    throw new Error('Máy chủ chưa xác nhận lưu ảnh đại diện của kho.');
                }
                setDraft(null);
            }
            setNotice('Đã lưu hồ sơ thành công.');
        }catch(e){setNotice(e instanceof Error?e.message:'Không lưu được hồ sơ.');}finally{setBusy(false);}
    }
    function reset(){setDraft(null);setNotice('');}
    async function uploadAvatar(file: File) {
        setBusy(true);
        try {
            const folder = kind === 'company' ? 'companies' : kind === 'storehouse' ? 'warehouses' : 'avatars';
            const image = await uploadImage(file, folder);
            update(kind === 'company' ? 'profile.logo' : 'avatar', image.secureUrl);
            setNotice('Ảnh đã tải lên. Bấm Lưu thay đổi để cập nhật hồ sơ.');
        } catch (error) {
            setNotice(error instanceof Error ? error.message : 'Không tải được ảnh.');
        } finally {
            setBusy(false);
        }
    }
    return (
        <>
            <div className="wf-page-heading">
                <div>
                    <span className="wf-eyebrow">THÔNG TIN & THIẾT LẬP</span>
                    <h1>{title}</h1>
                    <p>{description}</p>
                </div>
                <span className="wf-outline-badge">Không gian hồ sơ</span>
            </div>
            <div className="wf-profile-banner">
                <div className="wf-profile-icon">
                    <Icon size={32} />
                </div>
                <div>
                    <div className="font-bold">
                        {kind === "company"
                            ? "Thông tin doanh nghiệp"
                            : kind === "storehouse"
                              ? "Thông tin kho hàng"
                              : "Trung tâm hệ thống WareFlow"}
                    </div>
                    <p>
                        Hoàn thiện hồ sơ để thông tin luôn rõ ràng, nhất quán.
                    </p>
                </div>
                <span className="wf-status">{source ? String(source.status || "Đã kết nối") : "Đang tải…"}</span>
            </div>
            <div className="wf-profile-grid">
                <form ref={form} onSubmit={submit} className="wf-profile-form">
                    <section className="wf-card wf-identity">
                        <div className="wf-section-heading">
                            <div className="font-bold">Nhận diện</div>
                            <p>
                                Hình ảnh đại diện cho{" "}
                                {kind === "company"
                                    ? "doanh nghiệp"
                                    : kind === "storehouse"
                                      ? "kho hàng"
                                      : "tài khoản quản trị"}
                                .
                            </p>
                        </div>
                        <div className="wf-image-placeholder">
                            {avatarUrl ? (
                                <button
                                    type="button"
                                    className="wf-profile-avatar-button"
                                    aria-label="Xem ảnh đại diện"
                                    aria-haspopup="dialog"
                                    onClick={() => setPreviewImage(avatarUrl)}
                                >
                                    <img className="wf-profile-avatar" src={avatarUrl} alt="" width={64} height={64} />
                                </button>
                            ) : <ImagePlus size={25} />}
                            <div>
                                <strong>{avatarUrl ? 'Ảnh đại diện' : 'Chưa có hình ảnh'}</strong>
                                <p>Nhập đường dẫn hoặc tải ảnh lên.</p>
                            </div>
                        </div>
                        <ImageCropInput
                            label="Tải ảnh đại diện"
                            size={kind === 'storehouse' ? imageSizes.warehouse : imageSizes.avatar}
                            disabled={busy}
                            onCrop={uploadAvatar}
                        />
                    </section>
                    {sections.map((section, index) => (
                        <section className="wf-card" key={section.title}>
                            <div className="wf-section-heading">
                                <span className="wf-section-number">
                                    0{index + 1}
                                </span>
                                <div>
                                    <div className="font-bold">{section.title}</div>
                                    <p>{section.description}</p>
                                </div>
                            </div>
                            <div className="wf-fields">
                                {section.fields.map((field) => (
                                    <label
                                        key={field.name}
                                        className={`wf-field ${field.type === "textarea" ? "wf-field-wide" : ""}`}
                                    >
                                        <span>
                                            {field.label}
                                            {field.required && <b> *</b>}
                                            {field.readOnly && (
                                                <LockKeyhole size={12} />
                                            )}
                                        </span>
                                        {field.type === "textarea" ? (
                                            <textarea
                                                name={field.name} value={values[field.name]||''} onChange={e=>update(field.name,e.target.value)}
                                                rows={4}
                                                placeholder={field.placeholder}
                                                maxLength={2000}
                                            />
                                        ) : field.type === "select" ? (
                                            <select
                                                name={field.name} value={values[field.name]||''} onChange={e=>update(field.name,e.target.value)}
                                                required={field.required}
                                            >
                                                <option value="" disabled>
                                                    Chọn{" "}
                                                    {field.label.toLowerCase()}
                                                </option>
                                                {field.options?.map(
                                                    (option) => (
                                                        <option
                                                            value={option.value}
                                                            key={option.value}
                                                        >
                                                            {option.label}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        ) : (
                                            <input
                                                name={field.name} value={values[field.name]||''} onChange={e=>update(field.name,e.target.value)}
                                                type={field.type || "text"}
                                                placeholder={
                                                    field.placeholder ||
                                                    (field.readOnly
                                                        ? "Chưa có dữ liệu"
                                                        : `Nhập ${field.label.toLowerCase()}`)
                                                }
                                                required={field.required}
                                                readOnly={field.readOnly||field.name==='email'||(kind==='storehouse'&&['area','region'].includes(field.name))}
                                                min={
                                                    field.type === "number"
                                                        ? 0
                                                        : undefined
                                                }
                                                step={
                                                    field.type === "number"
                                                        ? "any"
                                                        : undefined
                                                }
                                                maxLength={kind === 'storehouse' && field.name === 'avatar' ? 2000 : 255}
                                                pattern={
                                                    field.required &&
                                                    (!field.type ||
                                                        field.type === "text")
                                                        ? ".*\\S.*"
                                                        : undefined
                                                }
                                            />
                                        )}
                                        {field.hint && (
                                            <small>{field.hint}</small>
                                        )}
                                    </label>
                                ))}
                            </div>
                        </section>
                    ))}
                    {notice && (
                        <div className="wf-notice" role="status">
                            <Info size={19} />
                            {notice}
                        </div>
                    )}
                    <div className="wf-form-actions">
                        <span>Kiểm tra thông tin trước khi xác nhận.</span>
                        <div>
                            <Button variant="secondary" onClick={reset}>
                                <RotateCcw size={16} />
                                Đặt lại
                            </Button>
                            <Button type="submit" disabled={busy||!source}>
                                <Save size={16} />
                                Lưu thay đổi
                            </Button>
                        </div>
                    </div>
                </form>
                <aside className="wf-profile-aside">
                    <section className="wf-card">
                        <span className="wf-aside-icon">
                            <ShieldCheck size={23} />
                        </span>
                        <h3>
                            Hồ sơ đầy đủ,
                            <br />
                            vận hành liền mạch.
                        </h3>
                        <p>
                            Thông tin hồ sơ giúp nhận diện đúng đơn vị và người
                            phụ trách trong toàn bộ quá trình quản lý.
                        </p>
                        <hr />
                        <div className="wf-help-row">
                            <Info size={17} />
                            <span>
                                Các trường có dấu <b>*</b> là thông tin bắt
                                buộc.
                            </span>
                        </div>
                        <div className="wf-help-row">
                            <LockKeyhole size={17} />
                            <span>
                                Mã định danh, trạng thái và thời gian tạo do hệ
                                thống quản lý.
                            </span>
                        </div>
                    </section>
                </aside>
            </div>
            {previewImage && (
                <Modal title="Ảnh đại diện" wide onClose={() => setPreviewImage(null)}>
                    <img className="wf-profile-avatar-preview" src={previewImage} alt="Ảnh đại diện" />
                </Modal>
            )}
        </>
    );
}
