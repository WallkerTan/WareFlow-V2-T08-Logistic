export type LoginRequest = { email: string; password: string; remember: boolean };
export type CompanyRegistrationRequest = {
    companyName: string;
    taxCode: string;
    fullName: string;
    phone: string;
    email: string;
    password: string;
};

// Cookie-based session: the server must issue an HttpOnly session cookie.
// URLs are configurable until the backend auth contract is available.
const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const loginPath = import.meta.env.VITE_AUTH_LOGIN_PATH || '/auth/login';
const registerPath = import.meta.env.VITE_AUTH_REGISTER_PATH || '/auth/register';

async function post(path: string, payload: LoginRequest | CompanyRegistrationRequest): Promise<void> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
        const response = await fetch(`${baseUrl}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
        if (!response.ok) {
            const messages: Record<number, string> = {
                400: 'Thông tin gửi lên chưa hợp lệ. Vui lòng kiểm tra lại.',
                401: 'Email hoặc mật khẩu không chính xác.',
                403: 'Tài khoản chưa được phép truy cập. Vui lòng liên hệ quản trị viên.',
                404: 'API xác thực chưa được cấu hình trên máy chủ.',
                409: 'Email hoặc mã số thuế đã được đăng ký.',
                422: 'Thông tin chưa đáp ứng yêu cầu của máy chủ.',
                429: 'Bạn đã thử quá nhiều lần. Vui lòng đợi rồi thử lại.',
            };
            throw new Error(messages[response.status] || 'Dịch vụ xác thực đang gặp sự cố. Vui lòng thử lại sau.');
        }
        // A dev-server HTML fallback must never be treated as successful auth.
        if (response.status !== 204 && !response.headers.get('content-type')?.includes('application/json')) {
            throw new Error('Phản hồi API không hợp lệ. Vui lòng kiểm tra cấu hình máy chủ.');
        }
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Máy chủ phản hồi quá lâu. Vui lòng thử lại.', { cause: error });
        }
        if (error instanceof TypeError) {
            throw new Error('Không kết nối được dịch vụ xác thực. Vui lòng kiểm tra backend và thử lại.', { cause: error });
        }
        throw error;
    } finally {
        window.clearTimeout(timeout);
    }
}

export const authApi = {
    login: (values: LoginRequest) => post(loginPath, {
        email: values.email.trim().toLowerCase(), password: values.password, remember: !!values.remember,
    }),
    registerCompany: (values: CompanyRegistrationRequest) => post(registerPath, {
        companyName: values.companyName.trim(), taxCode: values.taxCode.replace(/-/g, ''),
        fullName: values.fullName.trim(), phone: values.phone.replace(/[\s.-]/g, ''),
        email: values.email.trim().toLowerCase(), password: values.password,
    }),
};
