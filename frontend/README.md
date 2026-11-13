# WareFlow frontend

React + TypeScript + Vite. Các màn hình nghiệp vụ lấy dữ liệu từ backend qua gateway, không có dữ liệu doanh nghiệp mẫu hay lưu nghiệp vụ trong localStorage.

## Chạy ứng dụng

1. Chạy PostgreSQL, gateway và các service theo hướng dẫn backend.
2. Trong thư mục frontend: chạy npm ci, sao chép .env.example thành .env.local nếu cần đổi gateway.
3. Chạy npm run dev rồi mở http://127.0.0.1:5173.

VITE_API_BASE_URL mặc định /api. Vite chuyển nguyên /api/* tới API_PROXY_TARGET (mặc định http://127.0.0.1:8080). Production cần reverse proxy cùng đường dẫn hoặc cấu hình URL gateway khi build, kèm CORS phù hợp.

## Chức năng kết nối

| Vai trò | Luồng giao diện |
| --- | --- |
| Hệ thống | Duyệt/khóa công ty, quản lý kho và nhà cung cấp/sản phẩm, duyệt giao dịch/trả kho, báo cáo/xếp hạng, nhật ký, thông báo |
| Công ty | Mua/thuê/thương lượng/trả/bàn giao kho, cấp/vô hiệu hóa nhân viên, khách hàng, xem hàng các kho, tạo/duyệt phiếu, điều chuyển, trung tâm phê duyệt |
| Quản lý kho | Sản phẩm và ảnh, lô hàng, cảnh báo, PO/nhận hàng, xuất bán/trả/hủy, soạn/đóng gói, kiểm kê/điều chỉnh, sổ biến động |
| Công ty/quản lý kho | Vận đơn, lịch sử giao hàng, COD, ngân sách, thu chi/đề nghị chi, báo cáo tài chính theo kỳ, hồ sơ và mật khẩu |

Upload ảnh dùng POST /api/core/upload/image với multipart file + folder. FE nhận secureUrl rồi lưu vào hồ sơ/sản phẩm qua API tương ứng. BE cần CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY và CLOUDINARY_API_SECRET hợp lệ; không đưa secret vào biến VITE_.

Các danh sách có trạng thái tải, rỗng, lỗi, bộ lọc và phân trang theo API. Thao tác thành công tải lại dữ liệu từ máy chủ. Backend vẫn là nơi kiểm tra quyền và điều kiện nghiệp vụ. Nhân viên không tự duyệt phiếu của kho; công ty không tự duyệt giao dịch mua/thuê kho.

## Xác thực

Đăng ký công ty tạo yêu cầu chờ duyệt, không tự đăng nhập. Phiên JWT được lưu trong sessionStorage; chọn ghi nhớ sẽ dùng localStorage. Không lưu mật khẩu. Logout/401/hết hạn xóa phiên. Trình duyệt chỉ lưu thêm mã kho đang chọn.

Quên mật khẩu hiện hướng dẫn liên hệ quản trị vì backend chưa có API reset; giao diện không hiển thị kết quả gửi email giả.

## Kiểm tra

- npm run lint
- npm run build
- npm run test:ui (cần Vite đang chạy; Chrome tại đường dẫn mặc định Windows hoặc CHROME_PATH, TEST_ORIGIN tùy chọn)

Browser test dùng fixture API chỉ trong tests để kiểm tra giao diện: đăng nhập, phân quyền, nhân viên, multipart upload, payload sản phẩm, tạo/gửi/duyệt PO, điều chuyển khác người quản lý trong cùng công ty, dashboard kho, giao hàng/thu COD, đăng ký chờ duyệt, nhập hàng hoàn có cách ly, lỗi máy chủ và 63 route theo vai trò. Đây không phải kiểm thử kết nối Cloudinary/PostgreSQL thật. Xem ../backend/API-COMPLETION.md cho hợp đồng backend và cấu hình dịch vụ.

Danh mục chức năng đối chiếu yêu cầu và toàn bộ API: [CHUC-NANG-VA-API.md](../backend/CHUC-NANG-VA-API.md).

Nhận hàng hoàn: vận đơn RETURNED → Nhập hàng hoàn → chọn tình trạng. Kho ghi phiếu nhập và SALES_RETURN, giữ nguồn lô, chống nhận trùng; không tự điều chỉnh tài chính.

Giao diện và cách thực hiện các luồng: [FEATURES.md](FEATURES.md). Test browser đã bổ sung gallery, lịch sử nhận PO, truy vết lô, kỳ quý, ngân sách/đề nghị chi, thông báo, nhật ký, xác nhận và form mobile. Trang giới thiệu được tải riêng để giảm bundle workspace.

## Kiểm tra kết nối API và dọn dữ liệu mẫu

Ứng dụng dùng API thật cho dữ liệu nghiệp vụ; dữ liệu fixture chỉ nằm trong thư mục tests và không được import vào src. Đã bỏ các component mẫu không được sử dụng, Redux rỗng và 10 thư viện dư. Không xóa dữ liệu trong cơ sở dữ liệu.

Dev và preview đều chuyển /api tới API_PROXY_TARGET. Có thể chạy npm run build rồi npm run preview để kiểm tra bản build với gateway. Khi triển khai production, cấu hình reverse proxy /api hoặc VITE_API_BASE_URL lúc build như hướng dẫn trên.

- npm run test:api: kiểm tra JWT, multipart, lỗi, phân trang Spring PageImpl/PagedModel và danh sách mảng.
- npm run test:live: gọi gateway thật qua http://127.0.0.1:5173/api, không giả lập API hay tạo dữ liệu. Đổi LIVE_API_BASE_URL nếu dùng cổng khác. Nếu cần kiểm tra danh sách được bảo vệ, cung cấp LIVE_API_TOKEN hoặc LIVE_API_EMAIL và LIVE_API_PASSWORD trong biến môi trường của phiên chạy; không ghi mật khẩu/token vào repository.

Khi BE trả lỗi, HTML hoặc danh sách sai cấu trúc, FE hiển thị lỗi; không thay bằng dữ liệu demo hay thông báo danh sách rỗng. Các danh mục phân biệt service và đường dẫn để tránh giữ nhầm dữ liệu khi đổi màn hình.
