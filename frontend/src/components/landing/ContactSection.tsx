import { Link } from 'react-router-dom';
import { Building2, ShieldCheck } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';
export function ContactSection() {
    return <section className="contact-main-section" id="contact"><RevealOnScroll><div className="section-title text-center"><p className="eyebrow"><i /> BẮT ĐẦU VỚI WAREFLOW</p><h2>Thiết lập không gian <em>công ty</em></h2><p className="section-subtitle">Đăng ký thông tin doanh nghiệp để quản trị hệ thống xét duyệt. Nhân viên nhận tài khoản từ công ty.</p></div></RevealOnScroll>
        <div className="contact-content-grid"><section className="contact-info-panel"><Building2 size={30} /><h3>Dành cho doanh nghiệp</h3><p>Khai báo lĩnh vực kinh doanh, thông tin công ty và tài khoản quản trị. Sau khi được duyệt, bạn có thể mua / thuê kho, cấp tài khoản nhân viên và quản lý hoạt động kho.</p><Link className="button" to="/auth/register">Đăng ký công ty →</Link></section>
            <section className="contact-form-panel"><ShieldCheck size={30} /><h3>Đã có tài khoản</h3><p>Đăng nhập bằng tài khoản được cấp. Vai trò và các kho được truy cập do hệ thống xác định.</p><Link className="button" to="/auth/login">Đăng nhập →</Link></section></div></section>;
}
