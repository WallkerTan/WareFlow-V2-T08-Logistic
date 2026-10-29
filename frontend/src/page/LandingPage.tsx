import "./landingPage.css";
const LandingPage = () => {
    return (
        <>
            <header className="header">
                <a className="brand" href="#top">
                    <span className="logo">W</span>
                    <span>
                        ware <b>flow</b>
                    </span>
                </a>
                <nav>
                    <a href="#features">Tính năng</a>
                    <a href="#workflow">Quy trình</a>
                    <a href="#contact">Liên hệ</a>
                </nav>
                <div className="header-actions">
                    <a className="login" href="#contact">
                        Đăng nhập
                    </a>
                    <a className="button button-small" href="#contact">
                        Dùng thử miễn phí <span>→</span>
                    </a>
                </div>
            </header>
            <main id="top">
                <section className="hero">
                    <div className="hero-copy">
                        <p className="eyebrow">
                            <i /> QUẢN LÝ KHO THẾ HỆ MỚI
                        </p>
                        <h1>
                            Vận hành kho <em>thông minh</em> hơn.
                        </h1>
                        <p className="intro">
                            WareFlow giúp bạn kiểm soát hàng tồn, đơn hàng và
                            logistics trong một nền tảng đơn giản, trực quan và
                            hiệu quả.
                        </p>
                        <div className="actions">
                            <a className="button" href="#contact">
                                Bắt đầu miễn phí <span>→</span>
                            </a>
                            <a className="watch" href="#workflow">
                                <strong>▶</strong> Xem cách hoạt động
                            </a>
                        </div>
                        <p className="note">
                            ✦ Không cần thẻ tín dụng &nbsp;·&nbsp; Thiết lập
                            trong 5 phút
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
                                <b>98.6%</b>
                                <small>Tỷ lệ giao đúng hạn</small>
                            </div>
                        </div>
                        <div className="stat-card bottom-card">
                            <span className="arrow">↗</span>
                            <div>
                                <b>+24.8%</b>
                                <small>Hiệu suất tháng này</small>
                            </div>
                        </div>
                    </div>
                </section>
                <section className="metrics">
                    <div>
                        <b>12.8K</b>
                        <small>Sản phẩm đang quản lý</small>
                    </div>
                    <div>
                        <b>98.6%</b>
                        <small>Đơn hàng giao đúng hạn</small>
                    </div>
                    <div>
                        <b>24/7</b>
                        <small>Dữ liệu luôn sẵn sàng</small>
                    </div>
                    <div>
                        <b>5 phút</b>
                        <small>Để bắt đầu vận hành</small>
                    </div>
                </section>
                <section className="features" id="features">
                    <div className="section-title">
                        <p className="eyebrow">
                            <i /> MỘT NỀN TẢNG DUY NHẤT
                        </p>
                        <h2>
                            Ít thao tác hơn.
                            <br />
                            <em>Nhiều kiểm soát hơn.</em>
                        </h2>
                    </div>
                    <div className="feature-grid">
                        <article>
                            <span>01</span>
                            <h3>Một trung tâm, mọi công ty</h3>
                            <p>
                                Theo dõi toàn bộ công ty con, kho hàng, nhà cung
                                cấp và giao dịch trên một hệ thống duy nhất.
                            </p>
                            <a href="#contact">Tìm hiểu thêm ↗</a>
                        </article>
                        <article>
                            <span>02</span>
                            <h3>Kho vận hành không gián đoạn</h3>
                            <p>
                                Từ nhập hàng, xuất hàng đến giao vận và kiểm kê
                                — mọi thao tác đều rõ ràng, có thể truy vết.
                            </p>
                            <a href="#contact">Tìm hiểu thêm ↗</a>
                        </article>
                        <article>
                            <span>03</span>
                            <h3>Quyết định dựa trên dữ liệu</h3>
                            <p>
                                Dashboard trực quan giúp bạn nắm tồn kho, thu
                                chi và hiệu suất vận hành theo thời gian thực.
                            </p>
                            <a href="#contact">Tìm hiểu thêm ↗</a>
                        </article>
                    </div>
                </section>
                <section className="workflow" id="workflow">
                    <div>
                        <p className="eyebrow">
                            <i /> TỪ KHO ĐẾN KHÁCH HÀNG
                        </p>
                        <h2>
                            Quy trình rõ ràng,
                            <br />
                            <em>vận hành nhẹ nhàng.</em>
                        </h2>
                    </div>
                    <p>
                        Tập trung vào việc phát triển doanh nghiệp. WareFlow lo
                        phần còn lại — từ dữ liệu tồn kho đến từng đơn giao
                        hàng.
                    </p>
                </section>
                <section className="cta" id="contact">
                    <p className="eyebrow">
                        <i /> SẴN SÀNG BẮT ĐẦU?
                    </p>
                    <h2>
                        Biến kho hàng thành
                        <br />
                        <em>lợi thế cạnh tranh.</em>
                    </h2>
                    <a className="button light" href="mailto:hello@wareflow.vn">
                        Đăng ký dùng thử <span>→</span>
                    </a>
                </section>
            </main>
            <footer>
                <a className="brand" href="#top">
                    <span className="logo">W</span>
                    <span>
                        ware <b>flow</b>
                    </span>
                </a>
                <small>© 2026 WareFlow. Quản lý thông minh hơn.</small>
            </footer>
        </>
    );
};

export default LandingPage;
