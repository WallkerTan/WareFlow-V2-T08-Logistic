# WareFlow backend – API và luồng nghiệp vụ

Gateway mặc định: `http://localhost:8080`.

| Service | Prefix qua gateway | Port chạy trực tiếp |
|---|---|---|
| Core | `/api/core` | 8081, không có prefix |
| Inventory | `/api/inventory` | 8082, không có prefix |
| Finance | `/api/finance` | 8083, không có prefix |
| Delivery | `/api/delivery` | 8084, không có prefix |

Các API nghiệp vụ yêu cầu `Authorization: Bearer <accessToken>`. ID là UUID, trừ ID thông báo và giao dịch tài chính dạng số. Danh sách phân trang dùng `page` bắt đầu từ 0, `size`, `sort`; dữ liệu nằm trong `content`. Các endpoint nội bộ chỉ dùng giữa các service, xác thực riêng bằng `X-Internal-Key`.

## 1. Đăng ký, duyệt công ty và nhân viên

1. `POST /api/core/auth/register-company`: tạo công ty **PENDING** và tài khoản COMPANY_ADMIN. Response giữ các trường thông tin tài khoản/công ty nhưng `accessToken`, `tokenType`, `expiresAt` là null. Frontend cần hiển thị chờ duyệt, không tự đăng nhập.
2. SYSTEM_ADMIN gọi `PATCH /api/core/companies/{companyId}/status`, body `{"status":"ACTIVE","reason":"Thông tin hợp lệ"}`.
3. Sau đó công ty đăng nhập bằng `POST /api/core/auth/login`.
4. Công ty tạo nhân viên qua `POST /api/core/employees`, body `{"email":"manager@example.com","password":"12345678","fullName":"Quản lý kho"}`. Nhân viên luôn thuộc công ty người tạo và có role WAREHOUSE_MANAGER.
5. Nhân viên đăng nhập qua API login chung, rồi được công ty bàn giao kho.

`businessModel` hỗ trợ FOOD, TECH, APPLIANCE, FASHION, OTHER. Nếu không gửi trường này, backend phân loại từ `businessDescription` bằng từ khóa tiếng Việt/Anh; không nhận diện được thì OTHER. Đây là phân loại theo quy tắc; công ty có thể cập nhật ngành chính xác qua hồ sơ công ty.

API tự đăng ký quản lý kho cũ `/auth/register-warehouse-manager` đã đóng: không đăng nhập nhận 401; có đăng nhập nhận 403 với hướng dẫn dùng `/employees`.

| API Core | Quyền / hành vi |
|---|---|
| `GET /employees` | Công ty xem nhân viên của mình |
| `GET /employees/{id}` | Chi tiết nhân viên trong công ty |
| `PATCH /employees/{id}` | Body `{"fullName":"Tên mới","status":"LOCKED"}`; ACTIVE để mở lại |
| `DELETE /employees/{id}` | Vô hiệu hóa tài khoản, giữ lịch sử |
| `GET /users/me` | Hồ sơ hiện tại, không trả passwordHash |
| `PUT /users/me` | `{"fullName":"Tên","avatar":"https://...","profile":{"phone":"...","address":"..."}}` |
| `PUT /users/me/password` | `{"currentPassword":"...","newPassword":"..."}`; thành công 204 |
| `PUT /companies/{id}` | Hồ sơ công ty: name, businessModel, phone, address, taxCode, logo, description |
| `DELETE /companies/{id}` | SYSTEM_ADMIN; đánh dấu DELETED, không xóa lịch sử. Từ chối nếu còn kho hoặc giao dịch kho đang chờ |

Hồ sơ WareFlow/tài khoản hệ thống dùng `/users/me` với SYSTEM_ADMIN. Chỉ có một SYSTEM_ADMIN; PostgreSQL có unique index cho role này. Email/tên công ty/tên kho cũng có index không phân biệt hoa thường. Nếu database cũ có dữ liệu trùng, cần giải quyết trùng trước khi khởi động với các ràng buộc mới. Khóa tài khoản hoặc công ty được kiểm tra lại khi dùng token; finance cũng xác minh tài khoản với core cho cả báo cáo không chọn kho.

## 2. Kho, mua/thuê, bàn giao và dashboard

| API Core | Chức năng |
|---|---|
| `POST /warehouses` | Hệ thống tạo kho sàn |
| `PUT /warehouses/{id}` | Hệ thống cập nhật name, warehouseType, area, price, region, address |
| `DELETE /warehouses/{id}` | Lưu trữ kho chưa thuộc công ty/chưa giao dịch bằng trạng thái ARCHIVED |
| `GET /warehouses` | search, status, warehouseType, region, minArea, maxArea, minPrice, maxPrice |
| `GET /warehouses/my-company` | Danh sách kho thuộc công ty hiện tại |
| `GET /warehouses/{id}` | Kho sàn hoặc kho thuộc công ty; kho của công ty khác bị từ chối |
| `PUT /warehouses/{id}/profile` | name, address, phone, description, images; hệ thống/chủ công ty/quản lý được giao kho |
| `POST /warehouse-transactions` | Chỉ công ty gửi đề nghị BUY/RENT; kho được giữ ở PENDING |
| `GET /warehouse-transactions/{id}` | Chi tiết giao dịch, giới hạn trong người tham gia hoặc hệ thống |
| `POST /warehouse-transactions/{id}/negotiations` | Người tham gia thương lượng |
| `POST /warehouse-transactions/{id}/approve` | Chỉ hệ thống duyệt, chuyển quyền sở hữu và ghi phí 5% |
| `POST /warehouse-transactions/{id}/reject` | Từ chối, giải phóng kho |
| `POST /warehouse-transactions/{id}/handover` | Công ty gửi `{"managerId":"uuid","note":"..."}` |
| `POST /warehouse-transactions/warehouses/{warehouseId}/return` | Công ty đề nghị trả kho |
| `POST /warehouse-transactions/{id}/approve-return` | Hệ thống duyệt trả |
| `POST /warehouse-transactions/{id}/reject-return` | Hệ thống từ chối trả |
| `GET /reports/system` | Tổng công ty, kho, giao dịch, doanh thu phí và số event tài chính chưa đồng bộ |
| `GET /reports/companies/rankings?metric=warehouses` | Xếp hạng; metric còn có transactions và revenue |
| `GET /reports/company` | Dashboard số kho, nhân viên, đề nghị kho chờ xử lý của công ty |
| `GET /approvals?page=0&size=20` | Trung tâm phê duyệt: đề nghị kho, đề nghị chi, phiếu kho chờ duyệt |

Bàn giao yêu cầu nhân viên ACTIVE thuộc đúng công ty và lấy snapshot thành công từ inventory. Không hoàn tất bàn giao nếu inventory chưa hoạt động (503). Dữ liệu tồn và lịch sử tiếp tục gắn với warehouseId; đổi người quản lý không xóa dữ liệu. Không thay đổi hình thức BUY/RENT khi kho đang thuộc công ty hoặc đang có đề nghị.

Trung tâm phê duyệt phân trang riêng cho từng nhóm/kho; response gồm `warehouseTransactions`, `negotiatingWarehouseTransactions`, `expenses`, `inventory`. Nếu service phụ thuộc không hoạt động, trả 503 để không hiển thị nhầm rằng không có việc chờ duyệt. Doanh thu trong xếp hạng revenue là INCOME từ finance; transactions trong xếp hạng core là giao dịch kho hoàn tất.

## 3. Nhà cung cấp, sản phẩm nhà cung cấp và khách hàng

Core có CRUD `/suppliers`, `/customers`: GET collection, GET `/{id}`, POST, PUT `/{id}`, DELETE `/{id}`. Tìm kiếm bằng `search`, lọc ngành bằng `businessModel`.

Body đối tác: `{"name":"Đối tác","businessModel":"FOOD","email":"contact@example.com","phone":"...","address":"..."}`.

Chỉ SYSTEM_ADMIN tạo/sửa/xóa nhà cung cấp toàn hệ thống. Công ty và nhân viên chỉ đọc nhà cung cấp cùng ngành với công ty. Khách hàng được chia sẻ trong công ty, chỉ COMPANY_ADMIN sửa; công ty khác không xem được. Xóa đối tác là xóa mềm.

Sản phẩm nhà cung cấp:

- `GET/POST /suppliers/{supplierId}/products`
- `PUT/DELETE /suppliers/{supplierId}/products/{productId}`
- Body: `{"sku":"SKU-01","name":"Sản phẩm","unit":"hộp","price":10000,"image":"https://..."}`. SKU duy nhất trong nhà cung cấp.

PO trong inventory nhận `supplierId`; nếu có ID, inventory xác minh nhà cung cấp tồn tại và đúng phạm vi ngành bằng token hiện tại. Vẫn nhận `supplierName` cho dữ liệu nhập thủ công cũ.

## 4. Hàng hóa, kiểm kê, xuất hàng, truy vết

Các API sản phẩm, lô, PO, receipts, exports, stocktakes, adjustments có sẵn dưới `/api/inventory/warehouses/{warehouseId}`. Phân quyền kiểm tra công ty sở hữu và nhân viên được bàn giao kho.

| API Inventory bổ sung | Chức năng |
|---|---|
| `GET /warehouses/{warehouseId}/movements` | Sổ biến động chỉ đọc; lọc productId, lotId, actorId, documentType, from, to |
| `GET /warehouses/{warehouseId}/alerts` | LOW_STOCK, NEAR_EXPIRY, EXPIRED |
| `GET /warehouses/{warehouseId}/approvals` | Các phiếu PENDING_APPROVAL cho công ty/hệ thống |
| `GET /warehouses/{warehouseId}/documents/{id}/print` | Phiếu HTML có escape nội dung, dùng trình duyệt in/lưu PDF |
| `GET /warehouses/{warehouseId}/snapshot` | Snapshot tồn kho có xác thực, dùng khi bàn giao |
| `POST /warehouses/{warehouseId}/exports/{id}/pick` | Đánh dấu đã lấy hàng, yêu cầu APPROVED |
| `POST /warehouses/{warehouseId}/exports/{id}/pack` | Đánh dấu đóng gói, yêu cầu đã pick |

Đơn EXPORT_SALE chỉ complete sau khi pack. approve giữ hàng; complete trừ tồn và giải phóng phần đã giữ; cancel giải phóng phần giữ. Điều chuyển ghi biến động cả hai kho, giữ hạn sử dụng và nguồn lô.

Hoàn tất STOCKTAKE tự tạo ADJUST ở PENDING_APPROVAL nếu có chênh lệch; `approval.adjustmentId` liên kết phiếu. Chỉ sau khi ADJUST được duyệt và hoàn tất mới cập nhật tồn. Nếu tồn thay đổi sau thời điểm đếm, từ chối điều chỉnh và yêu cầu kiểm kê lại. Không kiểm kê tổng sản phẩm và từng lô của cùng sản phẩm trong một phiếu. Sản phẩm nhiều lô cần đếm theo lô để xác định lô điều chỉnh.

Sổ biến động không có API sửa/xóa. Lọc thời gian dùng ISO-8601 UTC: `from` bao gồm, `to` không bao gồm. Cảnh báo tồn tối thiểu dựa trên lượng khả dụng; sắp hết hạn là trong 30 ngày.

## 5. Tài chính và phí

- `/api/finance/budgets`: tạo, sửa, xem ngân sách. Quản lý kho phải gửi warehouseId và chỉ xem ngân sách kho được giao.
- `/api/finance/transactions`: tạo/xem thu chi; quản lý kho không ghi EXPENSE trực tiếp.
- `/api/finance/reports/finance`, `/timeseries`, `/categories`: tổng hợp, biểu đồ theo thời gian/nhóm với period.
- `GET /api/finance/reports/finance/companies`: SYSTEM_ADMIN xem tổng thu/chi/phí các công ty; metric=revenue hoặc transactions, limit=1..1000.
- `GET /api/finance/audit-logs`: nhật ký tạo/sửa ngân sách, giao dịch, đề nghị chi và quyết định duyệt; lọc companyId, actorId, action. COMPANY_ADMIN chỉ xem công ty mình; SYSTEM_ADMIN chọn companyId.

Luồng đề nghị chi:

1. `POST /api/finance/expense-requests`: body `{"warehouseId":"uuid","category":"PURCHASE","amount":100000,"note":"Mua vật tư"}` → PENDING.
2. `GET /expense-requests?status=PENDING`: danh sách chờ; quản lý kho cần warehouseId.
3. Công ty gọi `POST /expense-requests/{id}/approve` hoặc `/reject`, body tùy chọn `{"note":"..."}`.
4. Duyệt mới ghi EXPENSE; duyệt lại cùng yêu cầu không ghi trùng. Đã từ chối thì không thể duyệt lại.

Phí WareFlow = **5% giá chốt mua/thuê kho**, làm tròn 2 chữ số. Không tự tính phí 5% trên giao dịch bán hàng nữa. Khi duyệt mua/thuê, core lưu platformFee cùng sự kiện tài chính trong cùng transaction. Worker gửi sự kiện sang finance; finance ghi EXPENSE mua/thuê và SYSTEM_FEE, khóa bằng eventId để không áp dụng hai lần. Khi finance gián đoạn, sự kiện còn trong DB và tự gửi lại. `/reports/system.pendingFinanceEvents` giúp kiểm tra tồn đọng.

Doanh thu phí core là khoản đã phát sinh khi giao dịch kho hoàn tất; báo cáo finance có thể cập nhật muộn hơn trong thời gian đồng bộ. Dữ liệu lịch sử theo cách tính phí cũ không tự xóa/viết lại; cần đối soát và chuyển đổi riêng theo số liệu thực tế trước khi dùng để báo cáo lịch sử.

## 6. Vận đơn, thông báo, email và ảnh

Delivery tiếp tục hỗ trợ `/api/delivery/warehouses/{warehouseId}/shipments`: tạo, sửa, tìm/lọc, xem chi tiết, PATCH `/{id}/status`, POST `/{id}/cod/collect`. Luồng CREATED → IN_TRANSIT → DELIVERED hoặc FAILED; FAILED có thể giao lại hoặc RETURNED. Chỉ vận đơn giao thành công mới xác nhận COD; thu lại không ghi trùng. Vận đơn liên kết đơn xuất bán đã DONE.

Core `/notifications`, `/notifications/unread-count`, PATCH `/{id}/read`, PATCH `/read-all` trả thông báo đúng người nhận. Thay đổi trạng thái công ty tạo thông báo cho từng thành viên. Thông báo hệ thống tập trung vào đăng ký/xóa công ty và mua/thuê/trả kho; bàn giao gửi cho nhân viên.

Inventory định kỳ quét cảnh báo (mặc định 15 phút), chuyển cho core để gửi trong app và email đến quản trị công ty/quản lý kho. Core chống thông báo lặp theo ngày/sản phẩm/lô/loại cảnh báo. Worker email lưu trạng thái và thử lại tối đa 10 lần; lịch thử lại tăng dần. SMTP thực tế có thể gửi lại nếu tiến trình dừng ngay sau khi SMTP đã nhận nhưng trước khi DB ghi nhận thành công.

Upload ảnh:

```http
POST /api/core/upload/image
Authorization: Bearer <token>
Content-Type: multipart/form-data

file=<binary image>
folder=products
```

Trả 201 với url, secureUrl, publicId, format, bytes. Giới hạn 10MB; kiểm tra chữ ký nội dung JPEG/PNG/GIF/WebP. Folder chỉ có general, avatars, companies, warehouses, products. Ảnh lưu trong thư mục theo người tải. Dùng secureUrl trong avatar/logo/images; giữ publicId để xóa.

`DELETE /api/core/upload/image?publicId=...`: chỉ người tải, COMPANY_ADMIN cùng công ty hoặc SYSTEM_ADMIN được xóa. Nếu Cloudinary xóa thất bại, giữ bản ghi sở hữu để thử lại. Ảnh cũ chưa có bản ghi media_assets cần nhập thông tin sở hữu trước khi xóa qua API.

## 7. Cấu hình và kiểm thử

Điền cấu hình trong môi trường chạy; `.env.example` và `docker-compose.yml` đã có các biến:

- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: upload thiếu cấu hình trả 503. Không còn credential mặc định trong source.
- `INTERNAL_API_KEY`: cùng một khóa ngẫu nhiên cho core/inventory/finance; bắt buộc để chạy đồng bộ tài chính và gửi cảnh báo tự động. Mặc định trống thì các worker này chưa gửi.
- `EMAIL_ENABLED=true`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_AUTH`, `SMTP_STARTTLS`: bật gửi mail sau khi cấu hình SMTP. Mặc định chưa gửi email.
- `CORE_SERVICE_URL`, `INVENTORY_SERVICE_URL`, `FINANCE_SERVICE_URL`: địa chỉ trực tiếp giữa các service. Docker đã dùng hostname service; local dùng localhost.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`: tài khoản hệ thống khởi tạo khi chưa có SYSTEM_ADMIN. Giá trị mặc định chỉ phục vụ phát triển; thay khi triển khai.
- `JWT_SECRET`, `JWT_ISSUER`: phải giống nhau ở các service.

Thay credential Cloudinary từng lưu trong lịch sử Git bằng credential mới. Không commit `.env` có secret.

Chạy từ thư mục backend:

```powershell
.\gradlew.bat :core-service:test :inventory-service:test :finance-service:test :delivery-service:test --continue
```

Test mặc định dùng H2 riêng, không dùng database phát triển. Test báo cáo PostgreSQL chỉ chạy khi cấu hình FINANCE_TEST_DB_URL, FINANCE_TEST_DB_DRIVER, FINANCE_TEST_DB_USER, FINANCE_TEST_DB_PASSWORD, FINANCE_TEST_DB_DIALECT trỏ đến database kiểm thử PostgreSQL riêng. Không trỏ test create-drop vào database có dữ liệu cần giữ.

Các test Cloudinary dùng mock, không upload/xóa tài nguyên thật; test SMTP không gửi email thật. Chỉ xác nhận tích hợp live sau khi điền credential và chạy thử trong môi trường triển khai.
