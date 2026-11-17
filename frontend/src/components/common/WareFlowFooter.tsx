import { CodeXml, Mail, Phone, MapPin, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import './wareflow-footer.css';

export default function WareFlowFooter() {
    return <footer className="wareflow-footer" aria-label="Thông tin công ty WareFlow">
        <div className="wareflow-footer-top">
            <Link to="/" className="wareflow-footer-brand">
                <span className="wareflow-footer-logo"><img src="/logo.png" alt="Logo WareFlow" /></span>
                <span><strong>CÔNG TY WAREFLOW</strong><span>Nền tảng quản lý kho hàng & logistics</span></span>
            </Link>
            <nav className="wareflow-footer-social" aria-label="Kết nối WareFlow">
                <a href="https://github.com/WallkerTan/WareFlow-V2-T08-Logistic" target="_blank" rel="noopener noreferrer" aria-label="WareFlow trên GitHub"><CodeXml size={21} /></a>
                <a href="mailto:contact@wareflow.vn" aria-label="Gửi email đến WareFlow"><Mail size={21} /></a>
                <a href="tel:19006868" aria-label="Gọi hotline WareFlow"><Phone size={21} /></a>
            </nav>
        </div>
        <div className="wareflow-footer-info">
            <section><h2><MapPin size={17} />Trụ sở chính</h2><address>Tòa nhà TechHub, Đường Số 7, Khu Công Nghệ Cao, TP. Thủ Đức, TP. Hồ Chí Minh</address></section>
            <section><h2><Clock size={17} />Giờ làm việc</h2><p>Thứ Hai – Thứ Bảy: 08:00 – 18:30</p><p>Hỗ trợ kỹ thuật khẩn cấp 24/7</p></section>
            <section><h2><Mail size={17} />Liên hệ</h2><a href="mailto:contact@wareflow.vn">contact@wareflow.vn</a><a href="tel:19006868">1900 6868</a><a href="tel:0988888999">0988 888 999</a></section>
        </div>
        <div className="wareflow-footer-copyright">© {new Date().getFullYear()} Công ty WareFlow. All rights reserved.</div>
    </footer>;
}
