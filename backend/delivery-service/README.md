# API vận đơn và COD

Service chạy ở cổng 8084. Qua gateway dùng:
`http://localhost:8080/api/delivery/warehouses/{warehouseId}/shipments`.
Gọi trực tiếp service thì bỏ `/api/delivery`.

Mọi endpoint yêu cầu `Authorization: Bearer <JWT>`. Quản lý kho được phân công
và quản trị công ty sở hữu kho có quyền đọc/ghi; SYSTEM_ADMIN chỉ đọc.

## Endpoint

| Method | Path sau đường dẫn gốc | Nội dung |
|---|---|---|
| POST | (rỗng) | Tạo vận đơn, trả 201 |
| GET | (rỗng) | Danh sách dạng Spring Page |
| GET | /{id} | Chi tiết và lịch sử |
| PATCH | /{id} | Sửa hãng, mã, COD khi CREATED |
| PATCH | /{id}/status | Chuyển trạng thái |
| POST | /{id}/cod/collect | Xác nhận thu đủ COD |

Danh sách hỗ trợ `page=0&size=20` (size 1–100), `status`, `codStatus`,
`q` tìm một phần mã vận đơn (không phân biệt hoa/thường).
Sắp xếp theo createdAt và id giảm dần.

Tạo vận đơn:

```json
{
  "documentId": "11111111-1111-1111-1111-111111111111",
  "carrier": "GHN",
  "trackingCode": "GHN-12345",
  "codAmount": 150000
}
```

Phiếu phải là EXPORT_SALE đã DONE, thuộc kho trong URL. Mỗi phiếu chỉ có một vận đơn.
Bộ warehouseId/carrier/trackingCode phải duy nhất (so sánh phân biệt hoa/thường,
bỏ khoảng trắng đầu cuối đối với dữ liệu nhập mới).
COD không âm, tối đa 13 chữ số nguyên và 2 chữ số thập phân; bỏ qua COD khi tạo thì bằng 0.

PATCH /{id} nhận một hoặc nhiều trường `carrier`, `trackingCode`, `codAmount`;
trường null hoặc không truyền được giữ nguyên. Không cho sửa documentId hay warehouseId.

PATCH /{id}/status:

```json
{"status": "IN_TRANSIT", "note": "Đã bàn giao cho hãng", "location": "Kho HCM"}
```

Luồng: CREATED → IN_TRANSIT → DELIVERED hoặc FAILED.
FAILED → IN_TRANSIT (giao lại) hoặc RETURNED. DELIVERED và RETURNED kết thúc.
Gửi lại trạng thái hiện tại không thêm lịch sử.

POST /{id}/cod/collect không cần body. Chỉ nhận khi DELIVERED và COD > 0.
Gọi lại sau khi thu thành công trả kết quả cũ; không thêm lần thu.
COD = 0 là NOT_REQUIRED; COD > 0 là PENDING cho đến khi xác nhận COLLECTED.
FAILED/RETURNED không tự coi là đã thu. Chưa hỗ trợ thu từng phần, hoàn tiền hoặc đối soát.

Ví dụ response rút gọn (response thực tế có history):

```json
{
  "id": "22222222-2222-2222-2222-222222222222",
  "warehouseId": "33333333-3333-3333-3333-333333333333",
  "documentId": "11111111-1111-1111-1111-111111111111",
  "carrier": "GHN",
  "trackingCode": "GHN-12345",
  "status": "DELIVERED",
  "codAmount": 150000,
  "codStatus": "COLLECTED",
  "collectedAt": "2026-11-11T09:00:00Z",
  "collectedBy": "44444444-4444-4444-4444-444444444444",
  "createdAt": "2026-11-11T08:00:00Z"
}
```

Lịch sử chứa action, status, time (UTC máy chủ), actorId và bản chụp hãng/mã/COD.
Chuyển trạng thái bổ sung previousStatus, note và location khi có.

Lỗi dùng ProblemDetail: 400 dữ liệu không hợp lệ, 401 token sai/hết hạn,
403 thiếu quyền, 404 sai kho hoặc không tồn tại, 409 trùng/ràng buộc nghiệp vụ,
503 không xác minh được dữ liệu từ core/inventory. Yêu cầu thất bại không ghi vận đơn.

## Cấu hình và nâng cấp

- JDK 21; core-service và inventory-service phải dùng cùng JWT secret/issuer.
- CORE_SERVICE_URL mặc định http://localhost:8081.
- INVENTORY_SERVICE_URL mặc định http://localhost:8082.
- HTTP_TIMEOUT_MS mặc định 5000 cho kết nối và đọc.
- JWT_SECRET, JWT_ISSUER được cấu hình giống inventory-service; Docker Compose đã có URL nội bộ.

Với database cũ: dừng delivery-service và sao lưu database, chạy
`db/upgrade-shipments.sql` bằng psql với `ON_ERROR_STOP=1` trước khi khởi động bản mới.
Script chạy trong transaction, kiểm tra trùng và COD âm trước khi thêm ràng buộc.
Nếu script dừng, xử lý dữ liệu được báo rồi chạy lại; không tự xóa vận đơn.
Không suy đoán đã thu tiền từ trạng thái DELIVERED của dữ liệu cũ:
COD dương được đặt PENDING, COD bằng 0 là NOT_REQUIRED.
Database mới được Hibernate tạo schema; lúc khởi động service cũng bổ sung COD status còn thiếu.

Kiểm thử và đóng gói bằng JDK 21:

```powershell
.\gradlew.bat test bootJar
```

Test sử dụng H2 ở chế độ PostgreSQL và mock HTTP dependency, không gọi dịch vụ thật.
Khi triển khai cần smoke test qua gateway với JWT và một phiếu EXPORT_SALE/DONE thật.
