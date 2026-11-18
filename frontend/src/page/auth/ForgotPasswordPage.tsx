import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authApi } from "../../services/authApi";

export default function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);
    const [otp, setOtp] = useState("");
    const [password, setPassword] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [wait, setWait] = useState(0);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!wait) return;
        const timer = window.setTimeout(() => setWait(wait - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [wait]);

    async function submit(confirm: boolean) {
        setBusy(true);
        setError("");
        try {
            if (confirm) {
                if (password !== confirmation) throw new Error("Mật khẩu xác nhận chưa khớp.");
                await authApi.resetPassword(email.trim(), otp, password);
                toast.success("Đã đổi mật khẩu. Vui lòng đăng nhập bằng mật khẩu mới.");
                navigate("/auth/login", { replace: true });
            } else {
                await authApi.forgotPassword(email.trim());
                setSent(true);
                setOtp("");
                setWait(60);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Vui lòng thử lại.");
        } finally {
            setBusy(false);
        }
    }

    function onSubmit(event: FormEvent) {
        event.preventDefault();
        void submit(sent);
    }

    return <form className="auth-form" onSubmit={onSubmit}>
        <label className="wf-field"><span>Email tài khoản</span>
            <input required type="email" autoComplete="email" maxLength={255} readOnly={sent} value={email} onChange={e => setEmail(e.target.value)} />
        </label>
        {sent && <>
            <p role="status">Nếu tài khoản đủ điều kiện, bạn sẽ nhận được mã qua email. Mã có hiệu lực trong 10 phút.</p>
            <label className="wf-field"><span>Mã xác nhận 6 số</span>
                <input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={e => setOtp(e.target.value)} />
            </label>
            <label className="wf-field"><span>Mật khẩu mới</span>
                <input required type="password" autoComplete="new-password" minLength={8} maxLength={100} value={password} onChange={e => setPassword(e.target.value)} />
            </label>
            <label className="wf-field"><span>Xác nhận mật khẩu mới</span>
                <input required type="password" autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} />
            </label>
            <button type="button" disabled={busy || wait > 0} onClick={() => void submit(false)}>
                {wait ? `Gửi lại mã sau ${wait}s` : "Gửi lại mã"}
            </button>
        </>}
        {error && <p role="alert">{error}</p>}
        <button disabled={busy} className="adm-btn adm-btn-primary">{busy ? "Đang xử lý…" : sent ? "Đổi mật khẩu" : "Gửi mã"}</button>
        <Link to="/auth/login">Quay lại đăng nhập</Link>
    </form>;
}
