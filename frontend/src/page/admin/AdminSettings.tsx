import { useState } from 'react';
import { Bell, Database, KeyRound, Save, Server, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { Card, Switch } from '../../components/admin/AdminUI';

export default function AdminSettings() {
    const [settings, setSettings] = useState({
        requireApproval: true,
        emailNotify: true,
        stockAlert: true,
        autoLock: false,
        auditLog: true,
        twoFactor: false,
    });
    const [saved, setSaved] = useState(false);

    function update(key: keyof typeof settings, value: boolean) {
        setSettings((current) => ({ ...current, [key]: value }));
        setSaved(false);
    }

    function save() {
        setSaved(true);
    }

    return (
        <>
            <div className="admin-page-head">
                <div>
                    <h2>Cài đặt hệ thống</h2>
                    <p>Cấu hình chính sách vận hành, thông báo và bảo mật cho toàn nền tảng WareFlow.</p>
                </div>
                <div className="admin-page-actions">
                    <button className="adm-btn adm-btn-primary" onClick={save}>
                        <Save size={15} /> Lưu thay đổi
                    </button>
                </div>
            </div>

            {saved && (
                <div className="adm-inline-note is-success" style={{ marginBottom: 18 }}>
                    <ShieldCheck size={15} />
                    <span>Đã lưu cấu hình hệ thống thành công. Thay đổi sẽ có hiệu lực ngay lập tức.</span>
                </div>
            )}

            <div className="adm-grid-equal">
                <Card title="Quản trị doanh nghiệp" subtitle="Quy tắc phê duyệt và giám sát không gian làm việc">
                    <div className="adm-switch-row">
                        <div>
                            <strong>Yêu cầu phê duyệt đăng ký</strong>
                            <small>Doanh nghiệp mới phải được quản trị duyệt trước khi kích hoạt</small>
                        </div>
                        <Switch checked={settings.requireApproval} onChange={(value) => update('requireApproval', value)} label="Yêu cầu phê duyệt" />
                    </div>
                    <div className="adm-switch-row">
                        <div>
                            <strong>Tự động khoá doanh nghiệp</strong>
                            <small>Khoá không gian làm việc khi quá hạn thanh toán phí nền tảng</small>
                        </div>
                        <Switch checked={settings.autoLock} onChange={(value) => update('autoLock', value)} label="Tự động khoá" />
                    </div>
                    <div className="adm-switch-row">
                        <div>
                            <strong>Ghi nhật ký kiểm toán</strong>
                            <small>Lưu vết mọi thao tác quản trị vào nhật ký hệ thống</small>
                        </div>
                        <Switch checked={settings.auditLog} onChange={(value) => update('auditLog', value)} label="Ghi nhật ký kiểm toán" />
                    </div>
                </Card>

                <Card title="Thông báo" subtitle="Kênh cảnh báo tới quản trị viên">
                    <div className="adm-switch-row">
                        <div>
                            <strong>Thông báo qua email</strong>
                            <small>Gửi tóm tắt hoạt động hằng tuần tới quản trị viên</small>
                        </div>
                        <Switch checked={settings.emailNotify} onChange={(value) => update('emailNotify', value)} label="Thông báo qua email" />
                    </div>
                    <div className="adm-switch-row">
                        <div>
                            <strong>Cảnh báo tồn kho</strong>
                            <small>Thông báo khi sản phẩm xuống dưới mức tồn tối thiểu</small>
                        </div>
                        <Switch checked={settings.stockAlert} onChange={(value) => update('stockAlert', value)} label="Cảnh báo tồn kho" />
                    </div>
                    <div className="adm-switch-row">
                        <div>
                            <strong>Thông báo trong ứng dụng</strong>
                            <small>Hiển thị thông báo tức thời trên thanh điều hướng</small>
                        </div>
                        <Switch checked={true} onChange={() => undefined} label="Thông báo trong ứng dụng" />
                    </div>
                </Card>
            </div>

            <div className="adm-grid-equal">
                <Card title="Bảo mật" subtitle="Chính sách xác thực và phiên làm việc">
                    <div className="adm-switch-row">
                        <div>
                            <strong>Xác thực hai lớp</strong>
                            <small>Bắt buộc mã xác thực khi quản trị viên đăng nhập</small>
                        </div>
                        <Switch checked={settings.twoFactor} onChange={(value) => update('twoFactor', value)} label="Xác thực hai lớp" />
                    </div>
                    <dl className="adm-kv" style={{ marginTop: 16 }}>
                        <dt>Thời hạn phiên làm việc</dt>
                        <dd>8 giờ</dd>
                        <dt>Độ dài mật khẩu tối thiểu</dt>
                        <dd>8 ký tự</dd>
                        <dt>Chính sách mật khẩu</dt>
                        <dd>Thường xuyên thay đổi</dd>
                    </dl>
                </Card>

                <Card title="Dịch vụ nền" subtitle="Trạng thái các thành phần của nền tảng">
                    <ul className="adm-list" style={{ margin: -18, marginTop: -18 }}>
                        {[
                            { name: 'core-service', detail: 'Quản lý danh tính, công ty và kho', status: 'Hoạt động', tone: 'is-success', icon: Server },
                            { name: 'inventory-service', detail: 'Sản phẩm, tồn kho và chứng từ', status: 'Hoạt động', tone: 'is-success', icon: Database },
                            { name: 'delivery-service', detail: 'Vận chuyển và theo dõi đơn hàng', status: 'Hoạt động', tone: 'is-success', icon: Bell },
                            { name: 'finance-service', detail: 'Giao dịch, ngân sách và phí nền tảng', status: 'Hoạt động', tone: 'is-success', icon: SlidersHorizontal },
                        ].map((service) => (
                            <li className="adm-list-item" key={service.name}>
                                <span className={`adm-list-icon ${service.tone}`}>
                                    <service.icon size={16} />
                                </span>
                                <div className="adm-list-text">
                                    <strong>{service.name}</strong>
                                    <small>{service.detail}</small>
                                </div>
                                <div className="adm-list-meta">
                                    <strong className="adm-text-success">{service.status}</strong>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            </div>

            <Card title="Khóa API" subtitle="Dùng để truy cập các dịch vụ nội bộ của WareFlow">
                <div className="adm-inline-note" style={{ marginBottom: 16 }}>
                    <KeyRound size={15} />
                    <span>
                        Khoá này hiển thị một lần duy nhất. Hãy lưu vào nơi quản lý bí mật an toàn trước khi đóng trang này.
                    </span>
                </div>
                <div className="adm-progress-row" style={{ gap: 12 }}>
                    <input className="adm-input" readOnly value="wf_live_9f3c81d47b2e6a508c41d9e7f3a2b6c8" aria-label="Khóa API" style={{ fontFamily: '"SF Mono", Consolas, monospace', fontSize: 12 }} />
                    <button className="adm-btn">Sao chép</button>
                    <button className="adm-btn">Tái tạo</button>
                </div>
            </Card>
        </>
    );
}
