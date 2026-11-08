import React, { useState } from "react";
import { RevealOnScroll } from "./RevealOnScroll";
import { 
    PhoneCall, 
    Mail, 
    MapPin, 
    Clock, 
    Send, 
    CheckCircle2, 
    ShieldCheck 
} from "lucide-react";

export const ContactSection: React.FC = () => {
    const [formData, setFormData] = useState({
        fullName: "",
        phone: "",
        email: "",
        companyName: "",
        warehouseSize: "under_500",
        message: ""
    });

    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setTimeout(() => {
            setIsSubmitting(false);
            setIsSubmitted(true);
        }, 800);
    };

    return (
        <section className="contact-main-section" id="contact">
            <RevealOnScroll>
                <div className="section-title text-center">
                    <p className="eyebrow">
                        <i /> KẾT NỐI VỚI CHÚNG TÔI
                    </p>
                    <h2>
                        Sẵn sàng nâng tầm <em>kho hàng của bạn?</em>
                        <br />
                        Hãy để đội ngũ chuyên gia hỗ trợ bạn ngay hôm nay
                    </h2>
                    <p className="section-subtitle">
                        Để lại thông tin để nhận tư vấn giải pháp chuyển đổi số kho bãi miễn phí và lịch demo trực quan trong vòng 15 phút.
                    </p>
                </div>
            </RevealOnScroll>

            <div className="contact-container-grid">
                {/* Cột trái: Thông tin liên hệ */}
                <RevealOnScroll delay={100} className="contact-info-panel">
                    <div className="info-card">
                        <span className="info-badge">Hỗ trợ 24/7</span>
                        <h3>Thông tin liên hệ trực tiếp</h3>
                        <p className="info-intro">
                            Chúng tôi luôn sẵn sàng lắng nghe mọi băn khoăn về quy trình và bài toán vận hành kho bãi của doanh nghiệp bạn.
                        </p>

                        <div className="info-items-list">
                            <div className="info-item">
                                <div className="info-icon">
                                    <PhoneCall size={20} />
                                </div>
                                <div>
                                    <small>Hotline tư vấn (Miễn cước)</small>
                                    <a href="tel:19006868" className="info-link">1900 6868 - 0988 888 999</a>
                                </div>
                            </div>

                            <div className="info-item">
                                <div className="info-icon">
                                    <Mail size={20} />
                                </div>
                                <div>
                                    <small>Email hợp tác & tư vấn</small>
                                    <a href="mailto:contact@wareflow.vn" className="info-link">contact@wareflow.vn</a>
                                </div>
                            </div>

                            <div className="info-item">
                                <div className="info-icon">
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <small>Trụ sở chính</small>
                                    <span>Tòa nhà TechHub, Đường Số 7, Khu Công Nghệ Cao, TP. Thủ Đức, TP. Hồ Chí Minh</span>
                                </div>
                            </div>

                            <div className="info-item">
                                <div className="info-icon">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <small>Giờ làm việc</small>
                                    <span>Thứ Hai - Thứ Bảy: 08:00 - 18:30 (Hỗ trợ kỹ thuật khẩn cấp 24/7)</span>
                                </div>
                            </div>
                        </div>

                        <div className="info-footer-commit">
                            <ShieldCheck size={18} className="commit-icon" />
                            <span>Cam kết bảo mật 100% thông tin doanh nghiệp và quy trình nội bộ.</span>
                        </div>
                    </div>
                </RevealOnScroll>

                {/* Cột phải: Form liên hệ tư vấn */}
                <RevealOnScroll delay={200} className="contact-form-panel">
                    <div className="form-card">
                        {isSubmitted ? (
                            <div className="form-success-state">
                                <div className="success-icon-wrap">
                                    <CheckCircle2 size={54} />
                                </div>
                                <h3>Cảm ơn bạn đã liên hệ!</h3>
                                <p>
                                    Yêu cầu tư vấn của bạn đã được gửi thành công. Chuyên viên giải pháp của WareFlow sẽ liên hệ qua điện thoại hoặc email trong vòng <strong>15 - 30 phút</strong> để tư vấn chi tiết.
                                </p>
                                <button 
                                    className="button button-small"
                                    onClick={() => {
                                        setIsSubmitted(false);
                                        setFormData({
                                            fullName: "",
                                            phone: "",
                                            email: "",
                                            companyName: "",
                                            warehouseSize: "under_500",
                                            message: ""
                                        });
                                    }}
                                >
                                    Gửi yêu cầu khác
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="contact-form">
                                <div className="form-heading">
                                    <h4>Đăng ký tư vấn & Trải nghiệm thử</h4>
                                    <p>Điền thông tin bên dưới để được demo sản phẩm theo ngành hàng của bạn</p>
                                </div>

                                <div className="form-row-2">
                                    <div className="form-group">
                                        <label htmlFor="fullName">Họ và tên *</label>
                                        <input
                                            id="fullName"
                                            name="fullName"
                                            type="text"
                                            required
                                            placeholder="Nguyễn Văn A"
                                            value={formData.fullName}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="phone">Số điện thoại *</label>
                                        <input
                                            id="phone"
                                            name="phone"
                                            type="tel"
                                            required
                                            placeholder="0912 345 678"
                                            value={formData.phone}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                <div className="form-row-2">
                                    <div className="form-group">
                                        <label htmlFor="email">Email công việc *</label>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            required
                                            placeholder="nguyenvana@company.vn"
                                            value={formData.email}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="companyName">Tên doanh nghiệp / Kho</label>
                                        <input
                                            id="companyName"
                                            name="companyName"
                                            type="text"
                                            placeholder="Công ty Cổ phần ABC"
                                            value={formData.companyName}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="warehouseSize">Quy mô kho dự kiến</label>
                                    <select
                                        id="warehouseSize"
                                        name="warehouseSize"
                                        value={formData.warehouseSize}
                                        onChange={handleChange}
                                    >
                                        <option value="under_500">Dưới 500 m² (Kho nhỏ / Cửa hàng)</option>
                                        <option value="500_2000">500 m² - 2.000 m² (Kho trung bình)</option>
                                        <option value="above_2000">Trên 2.000 m² (Kho lớn / Đa điểm)</option>
                                        <option value="multiple">Chuỗi nhiều kho chi nhánh</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="message">Bài toán hoặc nhu cầu cần tư vấn</label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        rows={3}
                                        placeholder="Ví dụ: Cần quản lý hàng cận date ngành dược phẩm, hoặc cần quản lý vị trí ô kệ đa kho..."
                                        value={formData.message}
                                        onChange={handleChange}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="button button-submit"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        "Đang gửi yêu cầu..."
                                    ) : (
                                        <>
                                            Gửi yêu cầu tư vấn ngay <Send size={18} />
                                        </>
                                    )}
                                </button>
                                <p className="form-privacy-note">
                                    ✦ Không spam · Không chia sẻ dữ liệu cho bên thứ ba · Tư vấn hoàn toàn miễn phí
                                </p>
                            </form>
                        )}
                    </div>
                </RevealOnScroll>
            </div>
        </section>
    );
};

export default ContactSection;
