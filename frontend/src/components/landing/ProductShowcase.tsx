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
        { label: "Bán lẻ & E-Commerce", desc: "Xử lý hàng nghìn đơn/ngày, tự động đồng bộ tồn kho đa kênh" },
        { label: "Sản xuất & Chế biến", desc: "Kiểm soát nguyên vật liệu, thành phẩm và định mức BOM chính xác" },
        { label: "Chuỗi phân phối & 3PL", desc: "Quản lý nhiều kho vệ tinh, phân luồng tuyến giao hàng tối ưu" },
        { label: "Thực phẩm & Dược phẩm", desc: "Quản lý nghiêm ngặt theo Lô (Batch) và Hạn sử dụng (FEFO/FIFO)" },
    ];

    const highlights = [
        "Kiểm soát chính xác 99.9% vị trí hàng hóa theo Ô/Kệ (Bin/Rack location)",
        "Giảm 45% thời gian soạn hàng (picking & packing) với lộ trình thông minh",
        "Tự động cảnh báo khi tồn kho chạm ngưỡng an toàn hoặc sắp hết hạn",
        "Báo cáo giá trị vốn lưu động và dòng tiền tồn kho thời gian thực",
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
                                <b>Quét mã Barcode / QR</b>
                                <small>Tốc độ nhận diện 0.2s</small>
                            </div>
                        </div>

                        <div className="image-overlay-card image-card-bottom">
                            <span className="icon-badge green">
                                <TrendingUp size={18} />
                            </span>
                            <div>
                                <b>Tiết kiệm 35% chi phí</b>
                                <small>Tối ưu hóa năng lực chứa kho</small>
                            </div>
                        </div>
                    </div>
                </RevealOnScroll>

                <div className="showcase-info-wrapper">
                    <RevealOnScroll delay={250}>
                        <div className="showcase-badge">
                            <Sparkles size={16} /> Thế hệ phần mềm WMS Cloud 2026
                        </div>
                        <h3>Loại bỏ 100% sự rời rạc trong vận hành kho hàng</h3>
                        <p className="showcase-desc">
                            Với giao diện trực quan, đồng bộ dữ liệu tức thời và khả năng kết nối linh hoạt giữa các phòng ban, WareFlow giúp đội ngũ của bạn làm việc ăn ý, loại bỏ hoàn toàn tình trạng thất thoát hàng hóa, sai sót đơn hàng và tắc nghẽn giao vận.
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
