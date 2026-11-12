import React from "react";
import { RevealOnScroll } from "./RevealOnScroll";
import { Check, X, Award } from "lucide-react";

export const ComparisonSection: React.FC = () => {
    const comparisons = [
        {criteria:'Tồn kho',traditional:'Tổng hợp số liệu từ các bảng riêng',wareflow:'Xem tồn thực tế, đã giữ và khả dụng theo kho'},
        {criteria:'Phê duyệt',traditional:'Trao đổi và ghi chép riêng',wareflow:'Theo dõi trạng thái phiếu và người phê duyệt'},
        {criteria:'Lô và hạn dùng',traditional:'Theo dõi thủ công từng lô',wareflow:'Danh sách lô và cảnh báo cận hạn'},
        {criteria:'Tài chính',traditional:'Tổng hợp thu chi thủ công',wareflow:'Ngân sách, đề nghị chi và báo cáo theo kỳ'},
        {criteria:'Phân quyền',traditional:'Chia sẻ tệp và quyền truy cập thủ công',wareflow:'Tách quyền hệ thống, công ty và người quản lý kho'},
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
