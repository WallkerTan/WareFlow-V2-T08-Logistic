import React from "react";
import { RevealOnScroll } from "./RevealOnScroll";
import { 
    Download, 
    Layers, 
    PackageCheck, 
    Truck, 
    ArrowRight, 
    Check 
} from "lucide-react";

export const WorkflowSection: React.FC = () => {
    const steps = [
        {
            num: "01",
            icon: <Download size={24} />,
            title: "Tiếp Nhận & Kiểm Đếm",
            desc: "Lập và duyệt đơn mua hàng, ghi nhận số lượng nhận thực tế, lô và hạn sử dụng.",
            highlight: "Nhận hàng theo PO"
        },
        {
            num: "02",
            icon: <Layers size={24} />,
            title: "Kiểm Soát Tồn Kho",
            desc: "Theo dõi tồn thực tế và khả dụng; lập phiếu kiểm kê, duyệt điều chỉnh khi có chênh lệch.",
            highlight: "Theo lô và hạn dùng"
        },
        {
            num: "03",
            icon: <PackageCheck size={24} />,
            title: "Soạn Hàng & Đóng Gói",
            desc: "Duyệt phiếu xuất bán, ghi nhận soạn hàng rồi đóng gói trước khi hoàn tất.",
            highlight: "Kiểm soát từng bước"
        },
        {
            num: "04",
            icon: <Truck size={24} />,
            title: "Xuất Kho & Giao Vận",
            desc: "Tạo vận đơn cho phiếu xuất bán đã hoàn tất, cập nhật trạng thái và thu COD.",
            highlight: "Lịch sử vận đơn"
        }
    ];

    return (
        <section className="workflow-process-section" id="workflow">
            <RevealOnScroll>
                <div className="section-title text-center">
                    <p className="eyebrow">
                        <i /> QUY TRÌNH CHUẨN HÓA
                    </p>
                    <h2>
                        Vận hành 4 bước mượt mà
                        <br />
                        <em>từ cửa kho tới tay khách hàng</em>
                    </h2>
                    <p className="section-subtitle">
                        Mọi mắt xích trong chuỗi vận hành đều được liên kết chặt chẽ, loại bỏ hoàn toàn các điểm nghẽn và thời gian chờ lãng phí.
                    </p>
                </div>
            </RevealOnScroll>

            <div className="workflow-steps-grid">
                {steps.map((step, idx) => (
                    <RevealOnScroll key={idx} delay={idx * 120} className="workflow-step-col">
                        <div className="step-card">
                            <div className="step-badge-row">
                                <span className="step-number">{step.num}</span>
                                <div className="step-icon-circle">{step.icon}</div>
                            </div>
                            <h3>{step.title}</h3>
                            <p className="step-desc">{step.desc}</p>
                            <div className="step-highlight">
                                <Check size={14} className="highlight-check" />
                                <span>{step.highlight}</span>
                            </div>
                        </div>
                        {idx < steps.length - 1 && (
                            <div className="step-connector-arrow">
                                <ArrowRight size={20} />
                            </div>
                        )}
                    </RevealOnScroll>
                ))}
            </div>
        </section>
    );
};

export default WorkflowSection;
