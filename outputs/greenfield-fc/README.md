# GreenField FC – Quản lý đội bóng

Dự án thực hành **quản lý đội bóng** cho *câu lạc bộ* GreenField FC. Dữ liệu cầu thủ và trận đấu được quản lý trong `data/danh_sach_cau_thu.xlsx`.

Tài liệu này thay thế ~~bản nháp~~; kết quả thao tác được ghi trong `bai_lam.md`. Website minh họa còn giữ lỗi API để thực hành báo cáo lỗi.

## Hướng dẫn sử dụng

1. Mở thư mục dự án bằng VS Code.
2. Kiểm tra tài nguyên:
   - Xem workbook trong Excel.
   - Xem nhật ký trong `logs`.
3. Mở [website đội bóng](web/index.html) bằng Chrome/Edge.

### Tài nguyên dự án

- `docs`: tài liệu bàn giao.
- `data`: dữ liệu đội bóng.
  - Cầu thủ và trận đấu.
- `logs`: nhật ký truy cập và báo cáo.

![Logo GreenField FC](web/images/greenfield-logo.png)

| Thư mục | Nội dung |
| :--- | --- |
| docs | Tài liệu bàn giao |
| data | Danh sách cầu thủ và trận đấu |
| logs | Log website |

```powershell
Get-ChildItem -Recurse -Force
```

---

## Bảo mật và tiến độ

- [x] Sắp xếp thư mục dự án
- [ ] Đưa dự án lên GitHub

> Không tải file .env lên GitHub.
>
> > Kiểm tra .gitignore trước khi commit.

Ví dụ ký tự nguyên dạng: \*không in nghiêng\*.

Tham khảo [hướng dẫn Markdown của GitHub](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax).
