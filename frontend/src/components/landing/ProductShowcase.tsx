import React from "react";
import { RevealOnScroll } from "./RevealOnScroll";
import { 
    QrCode, 
    TrendingUp, 
    Sparkles, 
    CheckCircle2 
} from "lucide-react";
import warehousePhoto from "../../assets/warehouse-photo.jpg";

export const ProductShowcase: React.FC = () => {
    const industries = [
        { label: "Bán lẻ & E-Commerce", desc: "Quản lý sản phẩm, nhập hàng và xuất bán" },
        { label: "Sản xuất & Chế biến", desc: "Theo dõi danh mục, lô hàng và biến động tồn" },
        { label: "Chuỗi phân phối & 3PL", desc: "Quản lý nhiều kho và phiếu điều chuyển" },
        { label: "Thực phẩm & Dược phẩm", desc: "Theo dõi lô, hạn sử dụng và hàng hư hỏng" },
    ];

    const highlights = [
        "Theo dõi số lượng thực tế, số lượng giữ và số lượng khả dụng",
        "Soạn hàng và đóng gói trước khi hoàn tất phiếu xuất bán",
        "Tự động cảnh báo khi tồn kho chạm ngưỡng an toàn hoặc sắp hết hạn",
        "Báo cáo thu chi theo kỳ và ngân sách theo kho",
    ];

    return (
        <section className="product-showcase-section" id="product">
            <RevealOnScroll>
                <div className="section-title text-center">
                    <p className="eyebrow">
                        <i /> GIỚI THIỆU SẢN PHẨM
                    </p>
                    <h2>
                        Hệ sinh thái quản trị kho <em>toàn diện</em>
                        <br />
                        dành cho doanh nghiệp hiện đại
                    </h2>
                    <p className="section-subtitle">
                        WareFlow không chỉ là phần mềm quản lý kho đơn thuần, mà là giải pháp số hóa toàn diện quy trình chuỗi cung ứng từ nhà cung ứng đến người tiêu dùng cuối.
                    </p>
                </div>
            </RevealOnScroll>

            <div className="showcase-content-grid">
                <RevealOnScroll delay={150} className="showcase-visual-wrapper">
                    <div className="showcase-image-card">
                        <img 
                            src={warehousePhoto} 
                            alt="Kho hàng vận hành cùng WareFlow" 
                            className="showcase-img"
                        />
                        <div className="image-overlay-card image-card-top">
                            <span className="icon-badge blue">
                                <QrCode size={18} />
                            </span>
                            <div>
                                <b>Danh mục sản phẩm</b>
                                <small>SKU và mã vạch</small>
                            </div>
                        </div>

                        <div className="image-overlay-card image-card-bottom">
                            <span className="icon-badge green">
                                <TrendingUp size={18} />
                            </span>
                            <div>
                                <b>Quản lý theo lô</b>
                                <small>Theo dõi hạn sử dụng</small>
                            </div>
                        </div>
                    </div>
                </RevealOnScroll>

                <div className="showcase-info-wrapper">
                    <RevealOnScroll delay={250}>
                        <div className="showcase-badge">
                            <Sparkles size={16} /> Thế hệ phần mềm WMS Cloud 2026
                        </div>
                        <h3>Kết nối nghiệp vụ kho và tài chính</h3>
                        <p className="showcase-desc">
                            Các màn hình dùng dữ liệu từ máy chủ và phân quyền theo quản trị hệ thống, quản trị công ty và nhân viên quản lý kho.
                        </p>

                        <div className="highlights-list">
                            {highlights.map((item, idx) => (
                                <div key={idx} className="highlight-item">
                                    <CheckCircle2 size={18} className="check-icon" />
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                    </RevealOnScroll>
                </div>
            </div>

            <RevealOnScroll delay={200}>
                <div className="industries-card-container">
                    <div className="industries-header">
                        <h4>Thiết kế chuyên biệt cho từng mô hình kinh doanh</h4>
                        <p>Dù doanh nghiệp của bạn ở quy mô nào, WareFlow đều có giải pháp tùy chỉnh phù hợp</p>
                    </div>
                    <div className="industries-grid">
                        {industries.map((ind, index) => (
                            <div key={index} className="industry-box">
                                <div className="industry-index">0{index + 1}</div>
                                <h5>{ind.label}</h5>
                                <p>{ind.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </RevealOnScroll>
        </section>
    );
};

export default ProductShowcase;
