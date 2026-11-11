# API thống kê thu chi và biểu đồ

Đường dẫn qua gateway: `http://localhost:8080/api/finance/reports/finance`.
Gọi trực tiếp finance-service ở cổng 8083 thì bỏ tiền tố `/api/finance`.

Các API yêu cầu header `Authorization: Bearer <JWT>` và chỉ đọc bảng
`transactions`. Số dư thu chi được tính bằng `income - expense - systemFee`;
`expense` không bao gồm phí sàn. Tiền được xử lý bằng BigDecimal.
Đây là thống kê dòng tiền đã ghi nhận, không phải lợi nhuận kế toán.
COD trong delivery-service chưa có giao dịch tương ứng sẽ chưa xuất hiện ở báo cáo.

## Endpoint và bộ lọc

| Method | Path | Kết quả |
|---|---|---|
| GET | /reports/finance | Tổng income, expense, systemFee, net (giữ response cũ) |
| GET | /reports/finance/timeseries | Chuỗi dữ liệu biểu đồ theo ngày/tháng |
| GET | /reports/finance/categories | Tổng theo từng danh mục |

Tham số chung:

- `period` bắt buộc: `2026-11`, `Q4-2026`, hoặc `2026`; năm 0001–9999.
- `companyId`: mặc định từ JWT; SYSTEM_ADMIN bắt buộc truyền.
- `warehouseId`: tùy chọn để xem một kho; WAREHOUSE_MANAGER bắt buộc truyền.
- Riêng timeseries có `groupBy=DAY|MONTH`; mặc định DAY cho kỳ tháng,
  MONTH cho kỳ quý/năm. Giá trị khác trả 400.

COMPANY_ADMIN chỉ xem công ty của mình và kho thuộc công ty đó.
WAREHOUSE_MANAGER chỉ xem kho được giao trong công ty mình.
SYSTEM_ADMIN xem công ty được chỉ định; mọi truy vấn vẫn lọc companyId.
Khi không chọn kho, báo cáo công ty bao gồm cả giao dịch không gắn kho.
Báo cáo một kho loại các giao dịch không gắn kho và giao dịch kho khác.

Ví dụ gọi trong PowerShell (đặt JWT vào biến $token):

```powershell
$headers = @{ Authorization = "Bearer $token" }
$base = "http://localhost:8080/api/finance/reports/finance"
Invoke-RestMethod "${base}?period=2026-11" -Headers $headers
Invoke-RestMethod "${base}/timeseries?period=2026-11&groupBy=DAY" -Headers $headers
Invoke-RestMethod "${base}/categories?period=2026-11" -Headers $headers
```

## Dữ liệu biểu đồ

Timeseries trả `period`, `timezone`, `groupBy`, `points`.
Mỗi điểm gồm date, income, expense, systemFee, net.
`date` là ngày đầu nhóm, theo định dạng YYYY-MM-DD.
Điểm tăng dần theo thời gian; ngày/tháng không có giao dịch vẫn được trả với số 0.

Ví dụ response đầy đủ cho một tháng gom thành một điểm:

```json
{
  "period": "2026-11",
  "timezone": "Asia/Ho_Chi_Minh",
  "groupBy": "MONTH",
  "points": [
    {
      "date": "2026-11-01",
      "income": 1000000.00,
      "expense": 300000.00,
      "systemFee": 50000.00,
      "net": 650000.00
    }
  ]
}
```

Frontend có thể dùng date làm trục X và các trường tiền làm chuỗi biểu đồ cột/đường.
API không trả HTML hoặc ảnh biểu đồ.

Categories trả `period`, `timezone`, `items`. Mỗi item có `category`,
`income`, `expense`, `systemFee`, `net`.
Luôn trả đủ danh mục theo thứ tự SALE, PURCHASE, TRANSFER, FEE, OTHER;
danh mục trống có số 0. Có thể dùng expense để vẽ cơ cấu chi và
income để vẽ cơ cấu thu; systemFee được thể hiện riêng để tránh đếm phí hai lần.

Ví dụ một item trong items:

```json
{"category":"SALE","income":1000000.00,"expense":0,"systemFee":0,"net":1000000.00}
```

Phí sàn tạo bởi luồng giao dịch hiện tại thuộc category FEE.
Tổng từng trường trong points/items bằng báo cáo tổng hợp cùng kỳ và phạm vi
khi không có giao dịch mới được ghi giữa các lần gọi.

## Múi giờ và tương thích

Mặc định `wareflow.finance.timezone=Asia/Ho_Chi_Minh`; có thể cấu hình bằng
`FINANCE_TIMEZONE`. Cấu hình này áp dụng đồng nhất cho báo cáo, danh sách giao dịch
và số tiền ngân sách đã chi.

Kỳ là khoảng từ 00:00 đầu kỳ đến trước 00:00 kỳ tiếp theo theo múi giờ cấu hình,
chuyển sang Instant để lọc createdAt. Timestamp trong database không thay đổi.
Ví dụ tháng 11/2026 theo giờ Việt Nam là
[2026-10-31T17:00:00Z, 2026-11-30T17:00:00Z).

So với bản cũ dùng UTC, giao dịch gần ranh giới ngày/tháng có thể đổi kỳ,
vì vậy cả tổng báo cáo và ngân sách lịch sử có thể thay đổi tương ứng.
Response tổng hợp cũ và định dạng period vẫn giữ nguyên; không cần migration dữ liệu.

Lỗi API dùng ProblemDetail: 400 tham số không hợp lệ, 401 token thiếu/sai/hết hạn,
403 ngoài phạm vi, 404 kho không tồn tại. Không xác minh được quyền kho thì yêu cầu thất bại.
Không tổng hợp chéo công ty khi thiếu companyId của SYSTEM_ADMIN.

## Kiểm thử và đóng gói

Dùng JDK 21:

```powershell
.\gradlew.bat test bootJar
```

Mặc định chạy unit, HTTP và kiểm tra context bằng H2;
FinanceReportsPostgresTests chỉ chạy khi có FINANCE_TEST_DB_URL trỏ đến PostgreSQL.
Truy vấn date_trunc/AT TIME ZONE cần được kiểm thử trên PostgreSQL thật.

Để chạy đầy đủ trên database kiểm thử riêng:

```powershell
$env:FINANCE_TEST_DB_URL = "jdbc:postgresql://127.0.0.1:15433/finance_test"
$env:FINANCE_TEST_DB_DRIVER = "org.postgresql.Driver"
$env:FINANCE_TEST_DB_DIALECT = "org.hibernate.dialect.PostgreSQLDialect"
$env:FINANCE_TEST_DB_USER = "postgres"
$env:FINANCE_TEST_DB_PASSWORD = "<test-password>"
.\gradlew.bat test bootJar --rerun-tasks
```

Chỉ dùng database dành riêng cho test: cấu hình test sử dụng create-drop.
Các ca PostgreSQL kiểm tra tổng hợp và đối chiếu biểu đồ, phạm vi công ty/kho,
giao dịch không gắn kho, ranh giới giờ Việt Nam, ngày nhuận,
múi giờ session database và tính nhất quán với giao dịch/ngân sách.
