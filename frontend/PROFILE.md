# Hồ sơ WareFlow

- /company/profile: companies; name, business_model và profile (tax_code, logo, address, description).
- /storehouse/profile: warehouses; name, region, area, address. Quyền sở hữu, giá, loại giao dịch, trạng thái và handover chỉ đọc.
- /wareflow/profile: users với role system_admin và company_id NULL; full_name, email, avatar, profile (phone, address).

CSDL hiện chưa có bảng hồ sơ tổ chức WareFlow riêng. Các khóa con JSONB trong profile/handover là đề xuất giao diện, cần thống nhất với backend khi kết nối.

Các trang nằm trong src/page/auth, company, storehouse, wareflow. MainLayout chứa Outlet; ProfileEditor, Button và RequestApprovalModal được tái sử dụng. Modal Xác nhận / Từ chối chỉ dùng cho yêu cầu đang chờ phê duyệt; đóng modal không từ chối yêu cầu. Lưu hồ sơ, đăng nhập, đăng ký và đặt lại không mở modal phê duyệt. Trường do hệ thống cấp để trống, chỉ đọc. Không có API, mock database, dữ liệu doanh nghiệp mẫu hoặc lưu trữ trong trình duyệt. Dữ liệu nhập mất khi rời trang.

Chạy npm run dev. Kiểm tra: npm run build, npm run lint, npm run test:ui (cần Vite đang chạy và Chrome cài sẵn). Bộ kiểm tra giao diện không giả lập API.
