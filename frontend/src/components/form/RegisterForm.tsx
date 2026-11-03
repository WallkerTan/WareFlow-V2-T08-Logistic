import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import AuthField from "./AuthField";

export type RegisterValues = {
    companyName: string;
    businessModel: "FOOD" | "TECH" | "APPLIANCE" | "FASHION" | "OTHER";
    fullName: string;
    phone: string;
    email: string;
    password: string;
    confirmPassword: string;
    accepted: boolean;
};
type Props = { onSubmit?: (values: RegisterValues) => Promise<unknown> };

export default function RegisterForm({ onSubmit }: Props) {
    "use no memo";
    const {
        register,
        handleSubmit,
        getValues,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<RegisterValues>({
        defaultValues: {
            companyName: "",
            businessModel: "OTHER",
            fullName: "",
            phone: "",
            email: "",
            password: "",
            confirmPassword: "",
            accepted: false,
        },
    });
    const [message, setMessage] = useState("");
    const [success, setSuccess] = useState(false);
    async function submit(values: RegisterValues) {
        setMessage("");
        setSuccess(false);
        try {
            if (onSubmit) {
                await onSubmit(values);
                setSuccess(true);
                setMessage("Yêu cầu đã được xử lý.");
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
            <button className="auth-submit" disabled={isSubmitting}>
                {isSubmitting ? "Đang tạo tài khoản…" : "Tạo tài khoản công ty"}
                <ArrowRight size={18} />
            </button>
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
