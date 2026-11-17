import React from "react";
import { RevealOnScroll } from "./RevealOnScroll";
import { Check, X, Award } from "lucide-react";

export const ComparisonSection: React.FC = () => {
    const comparisons = [
        {
            criteria: "Độ chính xác tồn kho",
            traditional: "70% - 85%, thường xuyên thất thoát và lệch số liệu",
            wareflow: "99.9%, kiểm soát chi tiết theo Barcode, QR và Serial",
            advantage: true
        },
        {
            criteria: "Thời gian xử lý 1 đơn hàng",
            traditional: "20 - 30 phút (tìm hàng thủ công, ghi chép sổ sách)",
            wareflow: "Dưới 3 phút nhờ lộ trình nhặt hàng tự động",
            advantage: true
        },
        {
            criteria: "Quản lý Lô & Hạn sử dụng",
            traditional: "Dễ bỏ sót hàng cận date, gây hủy hàng lãng phí vốn",
            wareflow: "Tự động cảnh báo FEFO/FIFO, không lo hàng quá hạn",
            advantage: true
        },
        {
            criteria: "Báo cáo & Ra quyết định",
            traditional: "Chờ kế toán tổng hợp vài ngày đến cuối tháng",
            wareflow: "Xem Dashboard thời gian thực bất kỳ lúc nào trên điện thoại/máy tính",
            advantage: true
        },
        {
            criteria: "Khả năng mở rộng đa kho",
            traditional: "Rối loạn thông tin khi mở thêm kho chi nhánh",
            wareflow: "Mở rộng không giới hạn điểm kho chỉ với vài cú nhấp chuột",
            advantage: true
        }
    ];

    return (
        <section className="comparison-section">
            <RevealOnScroll>
                <div className="section-title text-center">
                    <p className="eyebrow">
                        <i /> HIỆU QUẢ VƯỢT TRỘI
                    </p>
                    <h2>
                        Tại sao các chủ kho chọn <em>WareFlow</em>
                        <br />
                        thay vì cách quản lý cũ?
                    </h2>
                    <p className="section-subtitle">
                        So sánh trực diện giữa phương pháp quản lý bằng Excel / Sổ sách và hệ thống quản trị kho số hóa WareFlow.
                    </p>
                </div>
            </RevealOnScroll>

            <RevealOnScroll delay={150}>
                <div className="comparison-table-wrapper">
                    <div className="table-header-row">
                        <div className="col-criteria">Tiêu chí so sánh</div>
                        <div className="col-traditional">
                            <span className="badge-old"><X size={14} /> Quản lý thủ công / Excel</span>
                        </div>
                        <div className="col-wareflow">
                            <span className="badge-new"><Award size={14} /> Nền tảng WareFlow</span>
                        </div>
                    </div>

                    <div className="table-body">
                        {comparisons.map((row, idx) => (
                            <div key={idx} className="table-row">
                                <div className="col-criteria font-medium">
                                    {row.criteria}
                                </div>
                                <div className="col-traditional text-danger">
                                    <X size={16} className="status-icon-cross" />
                                    <span>{row.traditional}</span>
                                </div>
                                <div className="col-wareflow text-success">
                                    <Check size={16} className="status-icon-check" />
                                    <span>{row.wareflow}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </RevealOnScroll>
        </section>
    );
};

export default ComparisonSection;
