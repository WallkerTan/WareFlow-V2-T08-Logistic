import React from "react";
import { RevealOnScroll } from "./RevealOnScroll";
import {
    Boxes,
    PackageCheck,
    Truck,
    CircleDollarSign,
    BarChart3,
    ArrowRight,
    Layers,
    Zap
} from "lucide-react";

interface FeatureItem {
    id: string;
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    tag: string;
    description: string;
    benefits: string[];
}

export const FeaturesSection: React.FC = () => {
    const features: FeatureItem[] = [
        {
            id: "inbound-outbound",
            icon: <PackageCheck size={28} />,
            title: "Nhập & Xuất kho Tự động hóa",
            subtitle: "Inbound & Outbound Management",
            tag: "Vận hành cốt lõi",
            description: "Tạo phiếu nhập - xuất tức thì qua Barcode/QR, kiểm soát số lượng thực tế so với đơn mua hàng (PO), giảm 90% lỗi gõ tay.",
            benefits: ["Quét mã vạch kiểm hàng nhanh chóng", "Ghi nhận biến động tồn kho tức thời", "Hỗ trợ xuất kho đa kênh đồng thời"]
        },
        {
            id: "batch-expiry",
            icon: <Boxes size={28} />,
            title: "Quản lý Lô Hàng & Hạn Dùng",
            subtitle: "Batch & Expiry Control",
            tag: "Chất lượng & Tiêu chuẩn",
            description: "Kiểm soát chi tiết từng lô sản phẩm, số serial và hạn sử dụng. Tự động áp dụng chiến lược xuất hàng ưu tiên FEFO/FIFO tránh quá hạn.",
            benefits: ["Cảnh báo hàng cận date tự động", "Truy vết nguồn gốc lô hàng 1-click", "Quản lý vị trí Ô/Kệ chính xác"]
        },
        {
            id: "multi-warehouse",
            icon: <Layers size={28} />,
            title: "Quản lý Đa Kho & Điều Chuyển",
            subtitle: "Multi-Warehouse & Inter-transfers",
            tag: "Quy mô mở rộng",
            description: "Kết nối không giới hạn chi nhánh và kho trung tâm. Tạo lệnh điều chuyển liên kho với quy trình phê duyệt chặt chẽ, minh bạch.",
            benefits: ["Đồng bộ dữ liệu nhiều kho 24/7", "Quy trình duyệt chuyển kho 2 bước", "Phân quyền quản lý kho độc lập"]
        },
        {
            id: "logistics",
            icon: <Truck size={28} />,
            title: "Điều Phối Giao Vận & Đơn Hàng",
            subtitle: "Logistics & Dispatch Routing",
            tag: "Giao nhận thông minh",
            description: "Tối ưu hóa khâu bàn giao cho đơn vị vận chuyển, theo dõi tiến độ chuyến xe và đối soát đơn giao thành công theo thời gian thực.",
            benefits: ["Phân tuyến gom đơn giao hàng", "Theo dõi trạng thái giao vận trực tiếp", "Đối soát COD và cước vận chuyển"]
        },
        {
            id: "finance",
            icon: <CircleDollarSign size={28} />,
            title: "Quản Trị Tài Chính & Giá Vốn",
            subtitle: "Inventory Valuation & Costing",
            tag: "Dòng tiền doanh nghiệp",
            description: "Tự động tính toán giá vốn hàng bán (COGS), định giá tồn kho theo phương pháp bình quân gia quyền và theo dõi công nợ đối tác.",
            benefits: ["Báo cáo giá trị kho tức thì", "Theo dõi dòng tiền thu chi kho", "Cảnh báo vượt hạn mức công nợ"]
        },
        {
            id: "analytics",
            icon: <BarChart3 size={28} />,
            title: "Báo Cáo & Dự Báo Thông Minh",
            subtitle: "BI & Inventory Forecasting",
            tag: "Dữ liệu định hướng",
            description: "Hơn 20+ mẫu báo cáo chuyên sâu: tốc độ quay vòng hàng tồn, top sản phẩm bán chạy, dự báo nhu cầu nhập hàng mùa cao điểm.",
            benefits: ["Dashboard trực quan sinh động", "Xuất file Excel/PDF trong 3 giây", "Gợi ý số lượng đặt hàng tối ưu"]
        }
    ];

    return (
        <section className="features-showcase-section" id="features">
            <RevealOnScroll>
                <div className="section-title text-center">
                    <p className="eyebrow">
                        <i /> BỘ TÍNH NĂNG CỐT LÕI
                    </p>
                    <h2>
                        Đầy đủ công cụ mạnh mẽ
                        <br />
                        để bạn <em>làm chủ toàn bộ kho hàng</em>
                    </h2>
                    <p className="section-subtitle">
                        Mọi nghiệp vụ phức tạp nhất trong quản lý kho bãi được tinh gọn lại trong những thao tác cực kỳ đơn giản và chính xác.
                    </p>
                </div>
            </RevealOnScroll>

            <div className="features-card-grid">
                {features.map((feature, index) => (
                    <RevealOnScroll key={feature.id} delay={index * 100} className="feature-card-wrapper">
                        <div className="feature-modern-card">
                            <div className="card-top-row">
                                <div className="feature-icon-box">
                                    {feature.icon}
                                </div>
                                <span className="feature-tag">{feature.tag}</span>
                            </div>

                            <div className="card-title-group">
                                <h3>{feature.title}</h3>
                                <span className="feature-subtitle">{feature.subtitle}</span>
                            </div>

                            <p className="feature-desc">{feature.description}</p>

                            <div className="feature-benefits-list">
                                {feature.benefits.map((benefit, bIdx) => (
                                    <div key={bIdx} className="benefit-pill">
                                        <Zap size={14} className="pill-icon" />
                                        <span>{benefit}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </RevealOnScroll>
                ))}
            </div>

            <RevealOnScroll delay={200}>
                <div className="features-bottom-cta-banner">
                    <div className="banner-text">
                        <h4>Bạn cần tính năng chuyên biệt cho ngành hàng đặc thù?</h4>
                        <p>Đội ngũ chuyên gia WareFlow sẵn sàng tư vấn và cấu hình quy trình may đo riêng cho doanh nghiệp của bạn.</p>
                    </div>
                    <a href="#contact" className="button button-white">
                        Tư vấn giải pháp miễn phí <ArrowRight size={18} />
                    </a>
                </div>
            </RevealOnScroll>
        </section>
    );
};

export default FeaturesSection;
