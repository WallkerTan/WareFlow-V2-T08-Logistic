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
            desc: "Quét mã Barcode/QR đối chiếu đơn đặt hàng. Tự động phát hiện chênh lệch thừa/thiếu hoặc hàng lỗi ngay tại cửa nhập.",
            highlight: "Chính xác 100% đầu vào"
        },
        {
            num: "02",
            icon: <Layers size={24} />,
            title: "Phân Bổ Vị Trí Ô / Kệ",
            desc: "Hệ thống gợi ý vị trí lưu kho tối ưu theo tần suất luân chuyển (Fast/Slow moving) và tính chất bảo quản của từng sản phẩm.",
            highlight: "Tối ưu 40% diện tích"
        },
        {
            num: "03",
            icon: <PackageCheck size={24} />,
            title: "Soạn Hàng & Đóng Gói",
            desc: "Lộ trình nhặt hàng (Pick list) được tính toán theo đường đi ngắn nhất trong kho. Kiểm tra chéo trước khi niêm phong đóng gói.",
            highlight: "Gấp 2 lần tốc độ soạn"
        },
        {
            num: "04",
            icon: <Truck size={24} />,
            title: "Xuất Kho & Giao Vận",
            desc: "Tạo phiếu giao hàng, bàn giao cho tài xế hoặc đối tác 3PL. Cập nhật mã vận đơn và hành trình giao nhận tức thời cho khách hàng.",
            highlight: "Theo dõi thời gian thực"
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
