# API xuất hàng và điều chuyển kho

Base URL qua gateway: `/api/inventory/warehouses/{warehouseId}/exports`.
Gọi trực tiếp inventory-service (cổng 8082): `/warehouses/{warehouseId}/exports`.
Tất cả request cần `Authorization: Bearer <JWT>`.

| Method | Đường dẫn sau base URL | Chức năng |
|---|---|---|
| POST | (trống) | Tạo phiếu DRAFT |
| GET | `?type=EXPORT_TRANSFER&status=APPROVED&page=0&size=20` | Danh sách phiếu kho xuất, phân trang; type/status không bắt buộc |
| GET | `/{id}` | Chi tiết |
| POST | `/{id}/submit` | DRAFT → PENDING_APPROVAL |
| POST | `/{id}/approve` | PENDING_APPROVAL → APPROVED, giữ chỗ tồn kho |
| POST | `/{id}/reject` | PENDING_APPROVAL → CANCELLED |
| POST | `/{id}/cancel` | Hủy phiếu chưa DONE/CANCELLED, giải phóng tồn đã giữ chỗ |
| POST | `/{id}/complete` | APPROVED → DONE, trừ tồn và ghi biến động |

Các thao tác chuyển trạng thái nhận body tùy chọn `{"note":"Lý do hoặc ghi chú"}`.
Tạo thành công trả HTTP 201; các thao tác còn lại trả HTTP 200.
Response dùng `StockDocumentResponse`, giống API nhập hàng hiện tại.

## Tạo phiếu xuất bán

```json
{
  "type": "EXPORT_SALE",
  "note": "Xuất bán đơn hàng SO-001",
  "lines": [
    { "lotId": "11111111-1111-1111-1111-111111111111", "quantity": 5 }
  ]
}
```

Các loại khác: `EXPORT_RETURN` (trả nhà cung cấp), `EXPORT_DESTROY` (hủy hàng).
Không truyền kho/sản phẩm đích cho các loại này.

## Tạo phiếu điều chuyển

```json
{
  "type": "EXPORT_TRANSFER",
  "targetWarehouseId": "22222222-2222-2222-2222-222222222222",
  "note": "Bổ sung hàng cho kho nhận",
  "lines": [
    {
      "lotId": "11111111-1111-1111-1111-111111111111",
      "quantity": 5,
      "targetProductId": "33333333-3333-3333-3333-333333333333"
    }
  ]
}
```

Thay UUID ví dụ bằng ID thực tế. Sản phẩm đích phải tồn tại tại kho nhận, có cùng SKU
(không phân biệt hoa thường) và đơn vị với sản phẩm nguồn. Kho nhận phải khác kho xuất.
Khi `complete`, hệ thống trừ kho nguồn và cộng kho nhận trong **cùng một transaction**;
lỗi ở bất kỳ dòng nào sẽ rollback toàn bộ. Đây là điều chuyển hoàn tất ngay, chưa có
trạng thái vận chuyển hoặc bước xác nhận nhận hàng riêng.

Mỗi dòng điều chuyển tạo lô đích riêng có mã `TR-{documentId}-{sourceLotId}`, giữ nguyên
hạn dùng và tình trạng. `lines` lưu `lotCode` nguồn và `targetLotId`; hai biến động âm/dương
cùng tham chiếu phiếu điều chuyển. Hệ thống không tự tạo sản phẩm đích.

## Quyền và kiểm tra tồn kho

- Tạo/gửi/hủy/hoàn tất: `WAREHOUSE_MANAGER` được phân công kho hoặc `COMPANY_ADMIN` sở hữu kho.
- Duyệt/từ chối: `COMPANY_ADMIN` hoặc `SYSTEM_ADMIN`.
- Xem: ba vai trò trên theo quyền truy cập kho hiện có.
- Điều chuyển yêu cầu quyền trên **cả hai kho** lúc tạo, duyệt và hoàn tất.
  Quản lý kho phải được phân công cả hai kho; nếu hai kho có quản lý khác nhau,
  dùng tài khoản `COMPANY_ADMIN` sở hữu cả hai kho để tạo và hoàn tất phiếu.
- Tồn khả dụng = `quantity - reserved`. Tạo nháp chưa giữ chỗ; duyệt kiểm tra lại và giữ chỗ.
- Không bán/điều chuyển hàng hỏng hoặc hết hạn; xuất hủy/trả nhà cung cấp được phép.
- Mỗi lô chỉ xuất hiện một lần, tối đa 100 dòng/phiếu; số lượng dương, tối đa hai chữ số thập phân.
- Hoàn tất lại một phiếu DONE trả phiếu hiện tại, không trừ tồn lần hai.
- Phiếu không sửa được sau tạo; hủy và tạo lại nếu cần đổi nội dung.
- HTTP 400: dữ liệu sai; 401/403: đăng nhập/quyền; 404: phiếu/lô/sản phẩm không thuộc kho;
  409: thiếu tồn, tình trạng hàng không hợp lệ hoặc sai bước xử lý.

## Database và kiểm thử

`StockLot.version` dùng optimistic locking để tránh ghi đè khi API nhập hàng/cập nhật lô
chạy đồng thời. Luồng xuất còn khóa phiếu và lô khi cập nhật, khóa nhiều lô theo thứ tự ID.
Cấu hình hiện tại `ddl-auto: update` tự thêm cột khi khởi động inventory-service.
Nếu môi trường quản lý schema thủ công, chạy trước khi deploy:

```sql
ALTER TABLE stock_lots ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0;
```

Chạy bằng JDK 21, từ thư mục `backend`:

```powershell
.\gradlew.bat :inventory-service:test --tests '*StockOutbound*Tests'
```

Test gồm nghiệp vụ, HTTP validation/phân quyền, và persistence với H2 (rollback,
hoàn tất lặp, duyệt đồng thời). H2 không thay thế kiểm thử trên PostgreSQL triển khai thực tế.
API này chưa tích hợp giao diện, tạo vận đơn hoặc hạch toán finance-service.
