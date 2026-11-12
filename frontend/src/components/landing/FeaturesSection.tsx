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
        {id:'stock',icon:<PackageCheck size={28}/>,title:'Nhập và xuất kho',subtitle:'Purchase orders & stock documents',tag:'Vận hành',description:'Lập đơn mua hàng, ghi nhận hàng nhận thực tế và theo dõi phiếu xuất qua từng bước phê duyệt.',benefits:['Nhận hàng theo PO','Soạn hàng và đóng gói','Lịch sử biến động tồn']},
        {id:'lots',icon:<Boxes size={28}/>,title:'Lô hàng và hạn dùng',subtitle:'Batch & expiry',tag:'Hàng hóa',description:'Theo dõi số lượng theo lô, tình trạng hàng và hạn sử dụng.',benefits:['Cảnh báo tồn thấp','Cảnh báo cận hạn','Kiểm kê và điều chỉnh']},
        {id:'warehouses',icon:<Layers size={28}/>,title:'Mua, thuê và bàn giao kho',subtitle:'Warehouse management',tag:'Đa kho',description:'Đề nghị giao dịch kho, thương lượng giá và bàn giao cho nhân viên quản lý.',benefits:['Phê duyệt giao dịch','Phân quyền theo công ty','Điều chuyển kho']},
        {id:'delivery',icon:<Truck size={28}/>,title:'Vận đơn và COD',subtitle:'Delivery tracking',tag:'Giao nhận',description:'Tạo vận đơn từ phiếu xuất bán đã hoàn tất, cập nhật trạng thái và ghi nhận thu COD.',benefits:['Mã vận đơn','Lịch sử trạng thái','Ghi nhận thu COD']},
        {id:'finance',icon:<CircleDollarSign size={28}/>,title:'Ngân sách và thu chi',subtitle:'Finance',tag:'Tài chính',description:'Quản lý ngân sách theo kỳ và theo kho, lập đề nghị chi để công ty xét duyệt.',benefits:['Ngân sách và số dư','Đề nghị chi','Báo cáo thu chi']},
        {id:'reports',icon:<BarChart3 size={28}/>,title:'Báo cáo và nhật ký',subtitle:'Reports & audit',tag:'Theo dõi',description:'Xem báo cáo tổng hợp theo quyền truy cập và nhật ký thao tác thực tế.',benefits:['Tổng quan công ty','Biểu đồ tài chính','Nhật ký hệ thống']},
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
                        <h4>Bắt đầu với tài khoản công ty</h4>
                        <p>Đăng ký công ty, chờ phê duyệt và cấp tài khoản cho nhân viên quản lý kho.</p>
                    </div>
                    <a href="#contact" className="button button-white">
                        Thông tin đăng ký <ArrowRight size={18} />
                    </a>
                </div>
            </RevealOnScroll>
        </section>
    );
};

export default FeaturesSection;
