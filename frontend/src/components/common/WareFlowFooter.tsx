import { Link } from 'react-router-dom';
import './wareflow-footer.css';
export default function WareFlowFooter() {
    return <footer className="wareflow-footer" aria-label="WareFlow"><div className="wareflow-footer-top"><Link to="/" className="wareflow-footer-brand"><span className="wareflow-footer-logo"><img src="/logo.png" alt="WareFlow" /></span><span><strong>WAREFLOW</strong><span>Quản lý kho hàng & logistics</span></span></Link></div>
        <div className="wareflow-footer-info"><section><h2>Quản lý tập trung</h2><p>Công ty, kho hàng, hàng hóa, ngân sách và giao nhận.</p></section><section><h2>Tài khoản</h2><Link to="/auth/login">Đăng nhập</Link><Link to="/auth/register">Đăng ký công ty</Link></section><section><h2>Không gian làm việc</h2><p>Truy cập theo vai trò và kho được bàn giao. Liên hệ quản trị công ty nếu cần hỗ trợ tài khoản.</p></section></div><div className="wareflow-footer-copyright">© {new Date().getFullYear()} WareFlow.</div></footer>;
}
