# Các bước cần tự kiểm tra trước khi nộp

1. File Explorer: bật View > Show > File name extensions và Hidden items. Các thao tác sắp xếp đã được hỗ trợ bằng CLI; cần tự thực hành phần GUI theo đề.
2. Mở web gốc `../GreenField_FC/web/index.html` bằng Chrome/Edge, F12 > Network rồi tải lại, chụp request logo lỗi thành `network.png` trong thư mục này. Không chụp hoặc mở .env.
3. Chụp lỗi đỏ trong Console thành `console.png`; chép nguyên văn vào mục Log của bai_lam.md và thay thông báo đó vào câu tìm kiếm Google. Lỗi khác nhau giữa mở bằng file:// và HTTP; không dùng thông báo dự đoán.
4. Mở `../web/index.html` của bản hoàn thiện, Ctrl+Shift+R để kiểm tra logo đã sửa. API `/api/players` vẫn giữ nguyên để luyện báo cáo lỗi theo đề.
5. VS Code: mở README.md rồi Ctrl+Shift+V để kiểm tra tiêu đề, bảng, logo, danh sách và liên kết.
6. Excel: mở `../data/danh_sach_cau_thu.xlsx`, kiểm tra công thức, định dạng %, các bộ lọc. Ctrl+Alt+F9 để tính lại và lưu. Bản trước khi sửa ở backup. Điểm thưởng đang tạm tính thắng 3/hòa 1/thua 0 vì đề chưa quy định.
7. GitHub tùy chọn: tạo repository riêng, kiểm tra danh sách upload không có .env và có .env.example. Chỉ tick hoàn thành và điền link repository sau khi tải lên thật. Chụp trang repo thành github.png.

Chưa có ảnh DevTools thật, chưa thu thập log Console nguyên văn, chưa có link repository. Những mục này đang được để rõ trong báo cáo để người làm hoàn thiện, không tạo minh chứng giả.
