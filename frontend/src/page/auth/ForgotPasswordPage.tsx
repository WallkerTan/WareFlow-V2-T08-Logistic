import { Link } from 'react-router-dom';
export default function ForgotPasswordPage() {
    return <div className="auth-form"><p>Nếu bạn là nhân viên, hãy liên hệ quản trị công ty để được hỗ trợ tài khoản. Quản trị công ty và quản trị hệ thống liên hệ đơn vị quản lý WareFlow để xác minh danh tính và hỗ trợ khôi phục.</p><p>Khi còn đăng nhập, bạn có thể đổi mật khẩu trong mục Hồ sơ & tài khoản.</p><Link className="adm-btn" to="/auth/login">Quay lại đăng nhập</Link></div>;
}
