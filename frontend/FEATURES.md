# Giao diện chức năng WareFlow

Giữ các luồng và URL cũ; bổ sung thao tác cho các API BE đang có. Không tạo thao tác hoàn một phần hoặc hoàn tiền tự động khi BE chưa hỗ trợ.

| Nhóm chức năng | Giao diện và thao tác |
| --- | --- |
| Công ty | Danh sách, lọc ngành/trạng thái, xem hồ sơ, cập nhật và duyệt/khóa/mở; xem chi tiết bản ghi trước khi xử lý. |
| Kho | Lọc khu vực, diện tích, giá, loại và trạng thái; xem ảnh, địa chỉ, công ty và người quản lý; tạo/sửa/lưu trữ, đề nghị mua/thuê/trả. |
| Giao dịch kho | Lọc trạng thái, thương lượng, duyệt/từ chối, bàn giao nhân viên; xem giá chốt, phí và lịch sử thương lượng. |
| Sản phẩm / lô | Danh mục, upload nhiều ảnh, xem ảnh lớn, CRUD, tồn và cảnh báo; từ lô bấm Truy vết lô để mở sổ biến động đã lọc. |
| PO và nhận hàng | Form nhiều dòng, tổng tiền dự kiến, gửi/duyệt, sửa nháp; nhận một phần bằng giảm số nhận hoặc bỏ dòng chưa nhận; xem lịch sử nhận theo PO và từng phiếu nhập. |
| Xuất / điều chuyển | Lọc loại xuất và trạng thái; form kho nhận/SKU/lô/số lượng; các nút lấy hàng, đóng gói, hoàn tất theo trạng thái; xem tiến độ và in phiếu. |
| Kiểm kê / điều chỉnh | Ghi thực đếm theo lô hoặc tổng sản phẩm; xem lệch và phiếu điều chỉnh sinh ra; điều chỉnh âm/dương có hướng dẫn và kiểm tra trùng lô. |
| Giao hàng / COD | Tạo/sửa vận đơn, cập nhật trạng thái, xem hành trình; hộp xác nhận COD hiện số tiền và vận đơn. |
| Hàng hoàn | Thông tin kiểm tra hàng trước khi nhận, chọn tình trạng; sau khi lưu hiện phiếu nhập hoàn và liên kết danh sách phiếu nhận. |
| Tài chính | Bộ chọn tháng/quý/năm; chọn công ty/kho, ngân sách và mức sử dụng; lọc loại thu/chi, trạng thái đề nghị; xem quyết định duyệt; HT có tab So sánh công ty toàn lịch sử. |
| Phê duyệt | Xem chi tiết phiếu và đề nghị chi trước khi duyệt/từ chối, theo đúng quyền. |
| Thông báo | Chuông và số chưa đọc, tab tất cả/chưa đọc/đã đọc, tìm tiêu đề, xem nội dung, đánh dấu đã đọc và mở công việc liên quan. |
| Nhật ký | Lọc ngày, người thao tác, hành động/công ty; xem nội dung, kết quả và lỗi; thống kê 7/30/90 ngày qua API. |
| Hồ sơ | Thông tin cá nhân/liên hệ/avatar, hồ sơ công ty/logo/thuế và hồ sơ kho/nhiều ảnh; đổi mật khẩu. |

## Cách dùng các thao tác mới

- Các danh sách có nút Xem chi tiết. Phiếu kho và giao dịch kho giữ nút Chi tiết riêng với nội dung nghiệp vụ đầy đủ.
- Nút xóa/vô hiệu hóa mở hộp xác nhận có tên bản ghi, lỗi và trạng thái xử lý. Không gửi API trước khi xác nhận.
- Đóng form đã thay đổi sẽ hỏi Tiếp tục sửa hoặc Bỏ thay đổi; không đóng trong lúc lưu/upload.
- Tìm kiếm toàn bộ danh sách chỉ dùng ở API có hỗ trợ. Các API chưa có search sử dụng ô Tìm trong trang hiện tại, không giả báo tìm toàn bộ dữ liệu.
- Bảng trên điện thoại giữ độ rộng cột, có chỉ dẫn vuốt ngang; form một cột, modal cuộn và giữ nút lưu ở cuối form.
- Danh sách đề nghị chi và nhật ký tài chính không áp dụng kỳ báo cáo nếu BE không hỗ trợ lọc kỳ. Tab So sánh công ty ghi rõ dữ liệu toàn lịch sử.

## Kiểm tra

npm run build và npm run lint trong frontend. Browser test: chạy Vite hoặc preview rồi npm run test:ui. TEST_ORIGIN đổi địa chỉ, CHROME_PATH đổi trình duyệt, TEST_ARTIFACT_DIR ghi ảnh chụp desktop/mobile.

Browser test dùng fixture riêng trong tests: kiểm tra 63 màn hình và các luồng tạo/sửa, upload, PO, điều chuyển, COD, nhận hoàn, gallery, quý/ngân sách/chi, thông báo, nhật ký, xác nhận xóa, hủy thay đổi và bố cục mobile. Không thay thế kiểm thử với BE/Cloudinary/SMTP thật.

Các màn hình dùng dữ liệu BE, không lưu nghiệp vụ mẫu trong trình duyệt. Tài liệu endpoint: ../backend/CHUC-NANG-VA-API.md.

Kết quả lượt kiểm tra cuối: build và lint đạt; browser test đạt 63 màn hình, 411 request API giả lập, không có lỗi JavaScript; đã xem ảnh desktop và mobile. Nút đăng xuất có thể dùng trực tiếp trên điện thoại.
