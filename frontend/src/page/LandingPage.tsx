import "./landingPage.css";
import { Link } from "react-router-dom";
import { ProductShowcase } from "../components/landing/ProductShowcase";
import { FeaturesSection } from "../components/landing/FeaturesSection";
import { WorkflowSection } from "../components/landing/WorkflowSection";
import { ComparisonSection } from "../components/landing/ComparisonSection";
import { ContactSection } from "../components/landing/ContactSection";
import { FloatingContactButton } from "../components/landing/FloatingContactButton";
import { RevealOnScroll } from "../components/landing/RevealOnScroll";
import { PhoneCall } from "lucide-react";

const LandingPage = () => {
    return (
        <div className="landing-page">
            {/* Header */}
            <header className="header">
                <a className="brand" href="#top">
                    <img src="/logo.png" alt="WareFlow" className="brand-logo-img" />
                    <span>
                        ware <b>flow</b>
                    </span>
                </a>
                <nav>
                    <a href="#product">Sản phẩm</a>
                    <a href="#features">Tính năng</a>
                    <a href="#workflow">Quy trình</a>
                    <a href="#contact">Liên hệ</a>
                </nav>
                <div className="header-actions">
                    <a className="login" href="#contact" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <PhoneCall size={16} /> Liên hệ tư vấn
                    </a>
                    <Link className="login" to="/auth/login">
                        Đăng nhập
                    </Link>
                    <Link className="button button-small" to="/auth/register">
                        Dùng thử miễn phí <span>→</span>
                    </Link>
                </div>
            </header>

            <main id="top">
                {/* Hero Section */}
                <section className="hero">
                    <div className="hero-copy">
                        <p className="eyebrow">
                            <i /> QUẢN LÝ KHO THẾ HỆ MỚI 2026
                        </p>
                        <h1>
                            Vận hành kho <em>thông minh</em> hơn.
                        </h1>
                        <p className="intro">
                            WareFlow giúp bạn kiểm soát hàng tồn, đơn hàng và logistics trong một nền tảng đơn giản, trực quan và đạt hiệu suất tối đa.
                        </p>
                        <div className="actions">
                            <Link className="button" to="/auth/register">
                                Bắt đầu miễn phí <span>→</span>
                            </Link>
                            <a className="button button-outline" href="#contact">
                                <PhoneCall size={18} /> Liên hệ với chúng tôi
                            </a>
                        </div>
                        <p className="note">
                            ✦ Không cần thẻ tín dụng &nbsp;·&nbsp; Thiết lập trong 5 phút &nbsp;·&nbsp; Hỗ trợ 24/7
                        </p>
                    </div>
                    <div className="hero-visual">
                        <div className="dashboard">
                            <div className="browser-bar">
                                <i />
                                <i />
                                <i />
                                <small>wareflow / dashboard</small>
                                <b>•••</b>
                            </div>
                            <img
                                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-dC8LQOelSfGRLOP7lyf5BG4dJ2VaHA.png"
                                alt="Dashboard quản lý kho WareFlow"
                            />
                        </div>
                        <div className="stat-card top-card">
                            <span className="green-dot" />
                            <div>
                                <b>99.8%</b>
                                <small>Độ chính xác tồn kho</small>
                            </div>
                        </div>
                        <div className="stat-card bottom-card">
                            <span className="arrow">↗</span>
                            <div>
                                <b>+35.2%</b>
                                <small>Tốc độ xử lý đơn hàng</small>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Metrics Banner */}
                <RevealOnScroll>
                    <section className="metrics ">
                        <div>
                            <b>500+</b>
                            <small>Doanh nghiệp tin dùng</small>
                        </div>
                        <div>
                            <b>99.8%</b>
                            <small>Độ chính xác tồn kho</small>
                        </div>
                        <div>
                            <b>-40%</b>
                            <small>Chi phí hao hụt & tồn đọng</small>
                        </div>
                        <div>
                            <b>24/7</b>
                            <small>Dữ liệu đồng bộ Real-time</small>
                        </div>
                    </section>
                </RevealOnScroll>

                {/* 1. Giới thiệu sản phẩm (Product Showcase) */}
                <ProductShowcase />

                {/* 2. Tính năng cốt lõi (Features Section) */}
                <FeaturesSection />

                {/* 3. Quy trình vận hành chuẩn hóa (Workflow Section) */}
                <WorkflowSection />

                {/* 4. So sánh hiệu quả (Comparison Section) */}
                <ComparisonSection />

                {/* 5. Khối Liên hệ với chúng tôi (Contact Section) */}
                <ContactSection />

                {/* Bottom Call to Action */}
                <section className="cta">
                    <RevealOnScroll>
                        <p className="eyebrow">
                            <i /> SẴN SÀNG CHUYỂN ĐỔI SỐ KHO HÀNG?
                        </p>
                        <h2>
                            Biến kho hàng thành
                            <br />
                            <em>lợi thế cạnh tranh vượt trội.</em>
                        </h2>
                        <div style={{ display: "flex", justifyContent: "center", gap: "20px", flexWrap: "wrap", marginTop: "24px" }}>
                            <Link className="button light" to="/auth/register">
                                Đăng ký dùng thử ngay <span>→</span>
                            </Link>
                            <a className="button" href="#contact" style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)" }}>
                                <PhoneCall size={18} /> Nhận tư vấn trực tiếp
                            </a>
                        </div>
                    </RevealOnScroll>
                </section>
            </main>

            {/* Footer */}
            <footer>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <a className="brand" href="#top">
                        <img src="/logo.png" alt="WareFlow" className="brand-logo-img brand-logo-footer" />
                        <span>
                            ware <b>flow</b>
                        </span>
                    </a>
                    <span style={{ color: "#a5b4c8" }}>|</span>
                    <small style={{ color: "#748299" }}>Giải pháp quản trị kho thông minh & Logistics thế hệ mới.</small>
                </div>
                <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
                    <a href="#product" style={{ color: "#64748b" }}>Sản phẩm</a>
                    <a href="#features" style={{ color: "#64748b" }}>Tính năng</a>
                    <a href="#contact" style={{ color: "#64748b" }}>Liên hệ</a>
                    <small>© 2026 WareFlow. All rights reserved.</small>
                </div>
            </footer>

            {/* Floating Contact & Quick Actions Button */}
            <FloatingContactButton />
        </div>
    );
};

export default LandingPage;
