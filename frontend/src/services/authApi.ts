export type LoginRequest = {
    email: string;
    password: string;
    remember: boolean;
};
export type CompanyRegistrationRequest = {
    companyName: string;
    businessModel: "FOOD" | "TECH" | "APPLIANCE" | "FASHION" | "OTHER";
    fullName: string;
    phone: string;
    email: string;
    password: string;
    otp?: string;
};

export type AuthResponse = {
    accessToken: string;
    tokenType: string;
    expiresAt: string;
    userId: string;
    email: string;
    fullName: string;
    role: string;
    companyId: string | null;
    companyName: string | null;
};

const AUTH_SESSION_KEY = "wareflow.auth";

// The gateway routes authentication to core; subsequent requests use the bearer token.
const baseUrl =
    (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "") + "/core";
const loginPath = import.meta.env.VITE_AUTH_LOGIN_PATH || "/auth/login";
const registerPath =
    import.meta.env.VITE_AUTH_REGISTER_PATH || "/auth/register-company";

async function post(
    path: string,
    payload: LoginRequest | CompanyRegistrationRequest,
): Promise<AuthResponse> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
        const response = await fetch(`${baseUrl}${path}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            credentials: "include",
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
        if (!response.ok) {
            const data = (await response.json().catch(() => null)) as {
                message?: string;
                error?: string;
            } | null;
            const messages: Record<number, string> = {
                400: "Thông tin gửi lên chưa hợp lệ. Vui lòng kiểm tra lại.",
                401: "Email hoặc mật khẩu không chính xác.",
                403: "Tài khoản chưa được phép truy cập. Vui lòng liên hệ quản trị viên.",
                404: "API xác thực chưa được cấu hình trên máy chủ.",
                409: "Email hoặc mã số thuế đã được đăng ký.",
                422: "Thông tin chưa đáp ứng yêu cầu của máy chủ.",
                429: "Bạn đã thử quá nhiều lần. Vui lòng đợi rồi thử lại.",
            };
            throw new Error(
                data?.message ||
                    data?.error ||
                    messages[response.status] ||
                    "Dịch vụ xác thực đang gặp sự cố. Vui lòng thử lại sau.",
            );
        }
        // A dev-server HTML fallback must never be treated as successful auth.
        if (
            !response.headers.get("content-type")?.includes("application/json")
        ) {
            throw new Error(
                "Phản hồi API không hợp lệ. Vui lòng kiểm tra cấu hình máy chủ.",
            );
        }
        return (await response.json()) as AuthResponse;
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            throw new Error("Máy chủ phản hồi quá lâu. Vui lòng thử lại.", {
                cause: error,
            });
        }
        if (error instanceof TypeError) {
            throw new Error(
                "Không kết nối được dịch vụ xác thực. Vui lòng kiểm tra backend và thử lại.",
                { cause: error },
            );
        }
        throw error;
    } finally {
        window.clearTimeout(timeout);
    }
}

async function postReset(path: string, payload: object, expectedStatus: number) {
    const response = await fetch(`${baseUrl}/auth/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
    });
    if (response.status !== expectedStatus) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || "Không thể xử lý yêu cầu. Vui lòng thử lại.");
    }
}

export const authApi = {
    emailConfig: async (signal: AbortSignal): Promise<boolean> => {
        const response = await fetch(`${baseUrl}/auth/email-config`, {
            cache: "no-store",
            signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
        });
        if (!response.ok) throw new Error("Không tải được cấu hình email.");
        const data = await response.json();
        if (typeof data.emailEnabled !== "boolean") throw new Error("Cấu hình email không hợp lệ.");
        return data.emailEnabled;
    },
    requestRegistrationCode: (email: string) => postReset("registration-code", { email }, 202),
    forgotPassword: (email: string) => postReset("forgot-password", { email }, 202),
    resetPassword: (email: string, otp: string, newPassword: string) =>
        postReset("reset-password", { email, otp, newPassword }, 204),
    login: async (values: LoginRequest) => {
        const result = await post(loginPath, {
            email: values.email.trim().toLowerCase(),
            password: values.password,
            remember: !!values.remember,
        });
        if (
            !result.accessToken ||
            !result.userId ||
            !["SYSTEM_ADMIN", "COMPANY_ADMIN", "WAREHOUSE_MANAGER"].includes(
                result.role,
            ) ||
            !Number.isFinite(Date.parse(result.expiresAt)) ||
            Date.parse(result.expiresAt) <= Date.now()
        )
            throw new Error("Phản hồi đăng nhập không hợp lệ.");
        sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(result));
        if (values.remember)
            localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(result));
        window.dispatchEvent(new Event("wareflow.auth"));
        return result;
    },
    registerCompany: (values: CompanyRegistrationRequest) =>
        post(registerPath, {
            companyName: values.companyName.trim(),
            businessModel: values.businessModel,
            fullName: values.fullName.trim(),
            phone: values.phone.replace(/[\s.-]/g, ""),
            email: values.email.trim().toLowerCase(),
            password: values.password,
            otp: values.otp,
        }),
};

export function getAuthSession(
    value = sessionStorage.getItem(AUTH_SESSION_KEY) ||
        localStorage.getItem(AUTH_SESSION_KEY),
): AuthResponse | null {
    if (!value) return null;
    try {
        const session = JSON.parse(value) as AuthResponse;
        if (
            !session.accessToken ||
            !session.userId ||
            !["SYSTEM_ADMIN", "COMPANY_ADMIN", "WAREHOUSE_MANAGER"].includes(
                session.role,
            ) ||
            !Number.isFinite(Date.parse(session.expiresAt)) ||
            Date.parse(session.expiresAt) <= Date.now()
        )
            return null;
        return session;
    } catch {
        sessionStorage.removeItem(AUTH_SESSION_KEY);
        localStorage.removeItem(AUTH_SESSION_KEY);
        return null;
    }
}

export function roleHome(role: string) {
    const r = (role || "").trim().toUpperCase();
    if (r === "SYSTEM_ADMIN" || r === "ADMIN") return "/admin/dashboard";
    if (r === "WAREHOUSE_MANAGER" || r === "STOREHOUSE" || r === "WAREHOUSE")
        return "/storehouse/inventory";
    return "/company/dashboard";
}

export function clearAuthSession() {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(AUTH_SESSION_KEY);
    window.dispatchEvent(new Event("wareflow.auth"));
}

export function scheduleSessionExpiry(expiresAt: string) {
    const timer = window.setTimeout(
        clearAuthSession,
        Math.min(2147483647, Math.max(0, Date.parse(expiresAt) - Date.now())),
    );
    return () => window.clearTimeout(timer);
}
