# Giao diện WareFlow

Chạy tại `frontend`: `npm install`, sau đó `npm run dev`.

## Cấu trúc

- `page/LandingPage.tsx`: trang độc lập tại `/`.
- `layout/auth`, `layout/admin`, `layout/company`, `layout/storehouse`: bốn layout, render trang con qua `Outlet`.
- `components/workspace/WorkspaceShell.tsx`: khung sidebar, header, footer và menu mobile dùng chung cho ba khu vực quản trị; không phải một route layout riêng.
- `components/workspace/WorkspacePages.tsx`: các thành phần bảng dữ liệu, thống kê, biểu đồ, form mẫu dùng lại.
- `page/auth`, `page/admin`, `page/company`, `page/storehouse`: các trang theo vai trò và chức năng.
- `routers/routers.tsx`: khai báo route và các đường dẫn tương thích cũ.

## Xem giao diện

| Khu vực | Đường dẫn |
| --- | --- |
| LandingPage | `/` |
| Đăng nhập / chọn vai trò | `/auth/login` |
| Đăng ký công ty | `/auth/register` |
| Quên mật khẩu | `/auth/forgot-password` |
| Quản trị hệ thống | `/admin/dashboard` |
| Công ty | `/company/dashboard` |
| Kho | `/storehouse/inventory` |

Sidebar có các liên kết chuyển khu vực để xem trước từng vai trò. Các trang bổ sung dùng dữ liệu minh họa; form tạo mới không lưu và không gọi API. Đăng nhập mẫu chỉ điều hướng tới giao diện được chọn. Một số trang có sẵn được giữ lại cùng thao tác cục bộ của chúng.

Các màn hình mới có bảng cuộn ngang trên màn hình nhỏ; sidebar mobile mở bằng nút menu trên header.
