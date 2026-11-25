import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import AuthField from "./AuthField";
import Button from "../ui/Button";
import { authApi } from "../../services/authApi";

export type RegisterValues = {
    companyName: string;
    businessModel: "FOOD" | "TECH" | "APPLIANCE" | "FASHION" | "OTHER";
    fullName: string;
    phone: string;
    email: string;
    otp?: string;
    password: string;
    confirmPassword: string;
    accepted: boolean;
};
type Props = { onSubmit?: (values: RegisterValues) => Promise<unknown>; emailEnabled?: boolean };

export default function RegisterForm({ onSubmit, emailEnabled = false }: Props) {
    "use no memo";
    const {
        register,
        handleSubmit,
        getValues,
        resetField,
        trigger,
        formState: { errors, isSubmitting },
    } = useForm<RegisterValues>({
        defaultValues: {
            companyName: "",
            businessModel: "OTHER",
            fullName: "",
            phone: "",
            email: "",
            otp: "",
            password: "",
            confirmPassword: "",
            accepted: false,
        },
    });
    const [message, setMessage] = useState("");
    const [success, setSuccess] = useState(false);
    const [sentEmail, setSentEmail] = useState("");
    const [sending, setSending] = useState(false);
    const [wait, setWait] = useState(0);

    useEffect(() => {
        if (!wait) return;
        const timer = window.setTimeout(() => setWait(wait - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [wait]);

    async function sendCode() {
        if (!emailEnabled || sending || isSubmitting || wait) return;
        setSending(true);
        setMessage("");
        setSuccess(false);
        try {
            if (!await trigger("email")) return;
            const email = getValues("email").trim().toLowerCase();
            await authApi.requestRegistrationCode(email);
            setSentEmail(email);
            resetField("otp");
            setWait(60);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Không gửi được mã xác minh.");
        } finally {
            setSending(false);
        }
    }
    async function submit(values: RegisterValues) {
        setMessage("");
        setSuccess(false);
        try {
            if (onSubmit) {
                if (emailEnabled && values.email.trim().toLowerCase() !== sentEmail) {
                    setMessage("Vui lòng yêu cầu mã xác minh cho địa chỉ email này.");
                    return;
                }
                await onSubmit({ ...values, otp: emailEnabled ? values.otp : undefined });
                setSuccess(true);
                setMessage("Đã gửi hồ sơ đăng ký công ty. Bạn có thể đăng nhập sau khi quản trị viên duyệt.");
            } else
                setMessage(
                    "Đây là bản giao diện. Chưa gửi yêu cầu đăng ký công ty đến máy chủ.",
                );
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Không thể xử lý yêu cầu.",
            );
        }
    }
    return (
        <form
            className="auth-form register-form"
            onSubmit={handleSubmit(submit)}
            noValidate
        >
            <div className="form-section-label">
                <span>01</span> Thông tin doanh nghiệp
            </div>
            <div className="auth-field-row">
                <AuthField
                    id="companyName"
                    label="Tên công ty"
                    autoComplete="organization"
                    placeholder="Công ty TNHH của bạn"
                    required
                    {...register("companyName", {
                        validate: (v) =>
                            !!v?.trim() || "Vui lòng nhập tên công ty.",
                    })}
                    error={errors.companyName?.message}
                />
                <div className="auth-field">
                    <label htmlFor="businessModel">
                        Lĩnh vực kinh doanh <span className="required"> *</span>
                    </label>
                    <div className="auth-input-wrap">
                        <select
                            id="businessModel"
                            {...register("businessModel", {
                                required: "Vui lòng chọn lĩnh vực kinh doanh.",
                            })}
                        >
                            <option value="FOOD">Thực phẩm</option>
                            <option value="TECH">Công nghệ</option>
                            <option value="APPLIANCE">Điện máy</option>
                            <option value="FASHION">Thời trang</option>
                            <option value="OTHER">Khác</option>
                        </select>
                    </div>
                    {errors.businessModel && (
                        <span className="field-error" role="alert">
                            {errors.businessModel.message}
                        </span>
                    )}
                </div>
            </div>
            <div className="form-section-label">
                <span>02</span> Tài khoản quản trị
            </div>
            <div className="auth-field-row">
                <AuthField
                    id="fullName"
                    label="Họ và tên"
                    autoComplete="name"
                    placeholder="Nguyễn Văn An"
                    required
                    {...register("fullName", {
                        validate: (v) => !!v?.trim() || "Vui lòng nhập họ tên.",
                    })}
                    error={errors.fullName?.message}
                />
                <AuthField
                    id="phone"
                    label="Số điện thoại"
                    type="tel"
                    autoComplete="tel"
                    placeholder="0901 234 567"
                    required
                    {...register("phone", {
                        required: "Vui lòng nhập số điện thoại.",
                        validate: (v) =>
                            /^(0\d{9}|\+84\d{9})$/.test(
                                v.replace(/[\s.-]/g, ""),
                            ) || "Số điện thoại Việt Nam không hợp lệ.",
                    })}
                    error={errors.phone?.message}
                />
            </div>
            <AuthField
                id="email"
                label="Email công việc"
                type="email"
                autoComplete="email"
                placeholder="ban@congty.vn"
                readOnly={sending}
                maxLength={255}
                required
                {...register("email", {
                    required: "Vui lòng nhập email.",
                    pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "Email không hợp lệ.",
                    },
                })}
                error={errors.email?.message}
            />
            {emailEnabled && <fieldset className="register-email-verification">
                <legend>Xác minh email</legend>
                <p>Gửi mã đến email công việc ở trên, sau đó nhập mã 6 chữ số để tiếp tục đăng ký.</p>
                <button type="button" className="auth-submit" disabled={sending || isSubmitting || wait > 0} onClick={() => void sendCode()}>
                    {sending ? "Đang gửi mã…" : wait ? `Gửi lại mã sau ${wait}s` : sentEmail ? "Gửi lại mã" : "Gửi mã xác minh"}
                </button>
                {sentEmail && <small role="status">Nếu email có thể đăng ký, mã sẽ được gửi đến {sentEmail} và có hiệu lực trong 10 phút.</small>}
                <AuthField
                    id="registrationOtp"
                    label="Mã xác minh email"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    {...register("otp", {
                        shouldUnregister: true,
                        required: "Vui lòng nhập mã xác minh.",
                        pattern: { value: /^[0-9]{6}$/, message: "Mã xác minh gồm 6 chữ số." },
                    })}
                    error={errors.otp?.message}
                />
            </fieldset>}
            <div className="auth-field-row">
                <AuthField
                    id="password"
                    label="Mật khẩu"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Ít nhất 8 ký tự"
                    required
                    {...register("password", {
                        required: "Vui lòng nhập mật khẩu.",
                        minLength: {
                            value: 8,
                            message: "Mật khẩu cần ít nhất 8 ký tự.",
                        },
                    })}
                    error={errors.password?.message}
                />
                <AuthField
                    id="confirmPassword"
                    label="Xác nhận mật khẩu"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Nhập lại mật khẩu"
                    required
                    {...register("confirmPassword", {
                        required: "Vui lòng xác nhận mật khẩu.",
                        validate: (v) =>
                            v === getValues("password") ||
                            "Mật khẩu xác nhận chưa khớp.",
                    })}
                    error={errors.confirmPassword?.message}
                />
            </div>
            <label className="auth-checkbox">
                <input
                    type="checkbox"
                    {...register("accepted", {
                        required:
                            "Vui lòng xác nhận bạn được phép đăng ký công ty.",
                    })}
                />{" "}
                Tôi xác nhận có quyền tạo và quản trị không gian làm việc cho
                công ty này.
            </label>
            {errors.accepted && (
                <span className="field-error" role="alert">
                    {errors.accepted.message}
                </span>
            )}
            {message && (
                <div
                    className={`auth-notice ${success ? "auth-notice-success" : "auth-notice-error"}`}
                    role={success ? "status" : "alert"}
                >
                    {message}
                </div>
            )}
            <Button variant="frame" type="submit" className="auth-submit wf-button-frame-auth" disabled={isSubmitting || sending}>
                {isSubmitting ? "Đang tạo tài khoản…" : "Tạo tài khoản công ty"}
                <ArrowRight size={18} />
            </Button>
            <p className="auth-switch">
                Đã có tài khoản? <Link to="/auth/login">Đăng nhập</Link>
            </p>
            <div className="auth-security">
                <ShieldCheck size={16} /> Khởi đầu hành trình vận hành kho thông
                minh
            </div>
        </form>
    );
}
