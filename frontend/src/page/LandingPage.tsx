import "./landingPage.css";
import warehousePhoto from "../assets/warehouse-photo.jpg";
import { Link } from "react-router-dom";
import { ProductShowcase } from "../components/landing/ProductShowcase";
import { FeaturesSection } from "../components/landing/FeaturesSection";
import { WorkflowSection } from "../components/landing/WorkflowSection";
import { ComparisonSection } from "../components/landing/ComparisonSection";
import { ContactSection } from "../components/landing/ContactSection";
import { FloatingContactButton } from "../components/landing/FloatingContactButton";
import { RevealOnScroll } from "../components/landing/RevealOnScroll";
import { PhoneCall } from "lucide-react";
import WareFlowFooter from '../components/common/WareFlowFooter';

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
                        <PhoneCall size={16} /> Thông tin tài khoản
                    </a>
                    <Link className="login" to="/auth/login">
                        Đăng nhập
                    </Link>
                    <Link className="button button-small" to="/auth/register">
                        Đăng ký công ty <span>→</span>
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
                                Đăng ký công ty <span>→</span>
                            </Link>
                            <a className="button button-outline" href="#contact">
                                <PhoneCall size={18} /> Liên hệ với chúng tôi
                            </a>
                        </div>
                        <p className="note">
                            Tài khoản công ty cần được quản trị hệ thống phê duyệt.
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
                                src={warehousePhoto}
                                alt="Ảnh minh họa kho hàng"
                            />
                        </div>
                        <div className="stat-card top-card">
                            <span className="green-dot" />
                            <div>
                                <b>Theo lô</b>
                                <small>Quản lý tồn và hạn dùng</small>
                            </div>
                        </div>
                        <div className="stat-card bottom-card">
                            <span className="arrow">↗</span>
                            <div>
                                <b>Có phê duyệt</b>
                                <small>Quy trình nhập / xuất</small>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Metrics Banner */}
                <RevealOnScroll>
                    <section className="metrics" aria-label="Số liệu nổi bật của WareFlow">
                        <div>
                            <b>Đa kho</b>
                            <small>Phân quyền theo kho</small>
                        </div>
                        <div>
                            <b>Theo lô</b>
                            <small>Quản lý tồn và hạn dùng</small>
                        </div>
                        <div>
                            <b>Thu / chi</b>
                            <small>Ngân sách và chi phí</small>
                        </div>
                        <div>
                            <b>Vận đơn</b>
                            <small>Trạng thái và COD</small>
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
                                Đăng ký công ty <span>→</span>
                            </Link>
                            <a className="button" href="#contact" style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)" }}>
                                <PhoneCall size={18} /> Tìm hiểu đăng ký
                            </a>
                        </div>
                    </RevealOnScroll>
                </section>
            </main>

            {/* Footer */}
            <WareFlowFooter />

            {/* Floating Contact & Quick Actions Button */}
            <FloatingContactButton />
        </div>
    );
};

export default LandingPage;
