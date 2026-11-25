import "./landingPage.css";
import { Link } from "react-router-dom";
import { ProductShowcase } from "../components/landing/ProductShowcase";
import { FeaturesSection } from "../components/landing/FeaturesSection";
import { WorkflowSection } from "../components/landing/WorkflowSection";
import { ComparisonSection } from "../components/landing/ComparisonSection";
import { ContactSection } from "../components/landing/ContactSection";
import { FloatingContactButton } from "../components/landing/FloatingContactButton";
import { RevealOnScroll } from "../components/landing/RevealOnScroll";
import { ArrowRight, Boxes, ChartNoAxesCombined, PhoneCall, Truck } from "lucide-react";
import WareFlowFooter from "../components/common/WareFlowFooter";
import { FrameButtonLink } from "../components/ui/Button";

/** Smooth scroll helper – works even when html doesn't have scroll-behavior:smooth */
const scrollTo = (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

const LandingPage = () => {
    return (
        <div className="landing-page">
            {/* Header */}
            <header className="header">
                <a className="brand" href="#top" onClick={scrollTo("top")}>
                    <img
                        src="/logo.png"
                        alt="WareFlow"
                        className="brand-logo-img"
                    />
                    <span>
                        ware <b>flow</b>
                    </span>
                </a>
                <nav>
                    <a href="#product" onClick={scrollTo("product")}>Sản phẩm</a>
                    <a href="#features" onClick={scrollTo("features")}>Tính năng</a>
                    <a href="#workflow" onClick={scrollTo("workflow")}>Quy trình</a>
                    <a href="#contact" onClick={scrollTo("contact")}>Liên hệ</a>
                </nav>
                <div className="header-actions">
                    <a
                        className="login"
                        href="#contact"
                        onClick={scrollTo("contact")}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                        }}
                    >
                        <PhoneCall size={16} /> Liên hệ tư vấn
                    </a>
                    <FrameButtonLink className="wf-button-frame-auth" to="/auth/login">Đăng nhập</FrameButtonLink>
                    <FrameButtonLink className="wf-button-frame-auth" to="/auth/register">
                        Dùng thử miễn phí <span>→</span>
                    </FrameButtonLink>
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
                            WareFlow giúp bạn kiểm soát hàng tồn, đơn hàng và
                            logistics trong một nền tảng đơn giản, trực quan và
                            đạt hiệu suất tối đa.
                        </p>
                        <div className="actions">
                            <Link className="button" to="/auth/register">
                                Bắt đầu miễn phí <span>→</span>
                            </Link>
                            <a
                                className="button button-outline"
                                href="#contact"
                                onClick={scrollTo("contact")}
                            >
                                <PhoneCall size={18} /> Liên hệ với chúng tôi
                            </a>
                        </div>
                        <p className="note">
                            ✦ Không cần thẻ tín dụng &nbsp;·&nbsp; Thiết lập
                            trong 5 phút &nbsp;·&nbsp; Hỗ trợ 24/7
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
                    <section
                        className="metrics"
                        aria-label="Số liệu nổi bật của WareFlow"
                    >
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

                <section className="landing-access" aria-labelledby="landing-access-title">
                    <RevealOnScroll>
                        <div className="landing-access-panel">
                            <div className="landing-access-copy">
                                <h2 id="landing-access-title">Đầy đủ tính năng. <em>Không cần gói VIP.</em></h2>
                                <p>
                                    Từ lúc hàng vào kho đến khi đơn được giao, đội ngũ của bạn có sẵn công cụ để làm việc theo từng vai trò. WareFlow không thu phí mở khóa các tính năng có sẵn trên hệ thống.
                                </p>
                                <Link className="button light" to="/auth/register">
                                    Bắt đầu với WareFlow <ArrowRight size={18} aria-hidden="true" />
                                </Link>
                            </div>
                            <ul className="landing-access-features">
                                <li><Boxes aria-hidden="true" /><span>Quản lý nhập, xuất và tồn theo lô</span></li>
                                <li><Truck aria-hidden="true" /><span>Theo dõi vận đơn và xác nhận thu hộ</span></li>
                                <li><ChartNoAxesCombined aria-hidden="true" /><span>Theo dõi ngân sách và báo cáo thu chi</span></li>
                            </ul>
                        </div>
                    </RevealOnScroll>
                </section>

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
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "center",
                                gap: "20px",
                                flexWrap: "wrap",
                                marginTop: "24px",
                            }}
                        >
                            <Link className="button light" to="/auth/register">
                                Đăng ký dùng thử ngay <span>→</span>
                            </Link>
                            <a
                                className="button"
                                href="#contact"
                                onClick={scrollTo("contact")}
                                style={{
                                    background: "rgba(255,255,255,0.15)",
                                    border: "1px solid rgba(255,255,255,0.3)",
                                }}
                            >
                                <PhoneCall size={18} /> Nhận tư vấn trực tiếp
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
