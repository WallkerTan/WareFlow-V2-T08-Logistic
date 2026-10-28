# Chạy và kiểm thử auth

Thực hiện trong thư mục `frontend` ở gốc repo (không phải bản sao trong `WareFlow-V2-T08-Logistic/frontend`).

```sh
npm install
npm run dev
```

- Đăng nhập: http://127.0.0.1:5173/auth/login
- Đăng ký công ty: http://127.0.0.1:5173/auth/register
- `/login`, `/register`, `/auth` và `/` có chuyển hướng tương ứng.

## Cấu hình API

Sao chép `.env.example` thành `.env.local` nếu cần đổi URL. Khởi động lại Vite sau khi đổi cấu hình.

Mặc định Vite chuyển tiếp `/api/*` đến `http://127.0.0.1:8081/api/*`, giữ nguyên đường dẫn. Có thể đổi `API_PROXY_TARGET`, `VITE_API_BASE_URL`, `VITE_AUTH_LOGIN_PATH`, `VITE_AUTH_REGISTER_PATH`.

**Backend trong repo hiện chưa có controller auth.** Các đường dẫn và cấu trúc dưới đây là hợp đồng frontend dự kiến, cần đối chiếu với API thật. Chưa xác minh đăng nhập thật, lưu database, hay tính bền vững của phiên.

### POST /api/auth/login

```json
{"email":"admin@company.vn","password":"your-password","remember":true}
```

### POST /api/auth/register

```json
{
  "companyName":"Công ty TNHH ABC",
  "taxCode":"0123456789001",
  "fullName":"Nguyễn Văn An",
  "phone":"+84901234567",
  "email":"admin@company.vn",
  "password":"your-password"
}
```

Email được trim và chuyển về chữ thường; tên được trim, mã số thuế bỏ dấu gạch ngang, điện thoại bỏ khoảng trắng/dấu chấm/gạch ngang. Không gửi xác nhận mật khẩu hoặc checkbox xác nhận quyền quản trị.

Thành công: HTTP 2xx với `Content-Type: application/json`, hoặc HTTP 204 không body. Đăng nhập dùng `credentials: include`: backend cần phát cookie phiên **HttpOnly**, cấu hình SameSite/Secure phù hợp, chống CSRF và gia hạn cookie theo `remember`. Frontend không lưu mật khẩu/token vào localStorage. Nếu backend dùng JWT trong JSON thì cần thay adapter theo cấu trúc response thật.

Lỗi: xử lý HTTP 400, 401, 403, 404, 409, 422, 429, lỗi máy chủ, mất kết nối và timeout 15 giây. Không hiển thị nội dung lỗi thô từ server. Backend cần tự kiểm tra dữ liệu, mã hóa mật khẩu, kiểm tra quyền và chống trùng dữ liệu.

Chưa có dashboard nên đăng nhập thành công hiển thị thông báo tại form. Đăng ký thành công xóa form và cung cấp link đăng nhập.

## Kiểm thử

```sh
npm run build
npm run lint
# Chạy khi Vite đang hoạt động:
npm run test:auth
```

Kiểm thử dùng Chrome headless thông qua CDP, không cần thêm thư viện. Biến `CHROME_PATH` cho phép chọn trình duyệt Chromium khác, `TEST_ORIGIN` đổi URL cần kiểm tra. Nếu môi trường hạn chế làm renderer không khởi động được, có thể dùng `CHROME_NO_SANDBOX=1` riêng cho lần kiểm thử local.

Test bao gồm kiểm tra form, hiện/ẩn mật khẩu, loading, payload POST, cookie HttpOnly giả lập, lỗi HTTP, timeout, đăng ký trùng, chuyển trang, responsive và backend không khả dụng. Test chặn request auth bằng phản hồi giả lập, trừ lượt cuối gọi backend thật để kiểm tra lỗi kết nối. Không tạo tài khoản thật.

Ảnh desktop/mobile và báo cáo kết quả được ghi vào `test-results/` (không commit). Test không ghi mật khẩu, email hoặc cookie vào báo cáo.
