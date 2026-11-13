# WareFlow — Chức năng và API backend

Cập nhật: 13/11/2026. Đối chiếu với file WareFlow-chức năng.txt của người dùng và các màn hình FE. Đây là tài liệu tổng hợp chính: ma trận yêu cầu, phân quyền, luồng nghiệp vụ, payload và danh mục endpoint.

## A. Kết quả đối chiếu yêu cầu

Ký hiệu: HT = SYSTEM_ADMIN; CT = COMPANY_ADMIN; QK = WAREHOUSE_MANAGER. Các mục dưới đây đã có triển khai; kết quả kiểm thử và giới hạn môi trường nằm ở cuối phần hướng dẫn.

| Mục yêu cầu | Chức năng BE và màn hình FE |
| --- | --- |
| 1.1 | Duyệt/khóa/mở công ty; đăng ký chờ duyệt; phân loại FOOD/TECH/APPLIANCE/FASHION/OTHER từ lựa chọn hoặc mô tả ngành; lưu mã số thuế. FE: công ty và đăng ký. |
| 1.2 | Báo cáo thu/chi công ty; phí 5% giá mua/thuê kho; đồng bộ sang finance bằng outbox có chống trùng. FE: tổng quan, tài chính và xếp hạng doanh thu. |
| 1.3 | Xếp hạng công ty theo số kho, giao dịch kho hoặc doanh thu. FE chọn tiêu chí. |
| 1.4–1.5 | HT tạo/cập nhật/lưu trữ kho, duyệt mua/thuê/trả kho, theo dõi thương lượng và toàn bộ kho. |
| 1.6 | HT CRUD nhà cung cấp và sản phẩm; CT/QK xem theo ngành công ty; không xóa cứng lịch sử đối tác. |
| 1.7 | Ràng buộc một HT, hồ sơ cá nhân/hệ thống, nhật ký và thông báo đăng ký/xóa công ty, mua/thuê/trả kho. |
| 2.1 | Danh sách kho thuộc công ty; xem danh mục, lô và tồn từng kho. |
| 2.2 | Cấp ngân sách theo kho/kỳ, tổng thu/chi/số dư, biểu đồ thời gian và nhóm, đề nghị chi và nhật ký tài chính. |
| 2.3 | Sàn kho lọc khu vực, diện tích, giá, BUY/RENT và tìm kiếm. |
| 2.4 | Đề nghị mua/thuê, thương lượng giá, bàn giao cho nhân viên ACTIVE cùng công ty; giữ tồn và lịch sử theo warehouseId. |
| 2.5 | Điều chuyển cùng công ty; kho nhận đúng SKU/đơn vị; giữ hàng khi duyệt và ghi tăng/giảm tồn hai kho khi hoàn tất. |
| 2.6 | Nhà cung cấp cùng ngành toàn hệ thống, sản phẩm NCC và khách hàng chung công ty; PO liên kết NCC được kiểm tra quyền. |
| 2.7 | Chỉ CT cấp/sửa/khóa/vô hiệu hóa tài khoản QK. Không mở đăng ký nhân viên công khai. |
| 2.8 | Trung tâm phê duyệt tổng hợp: chi, phiếu kho/điều chuyển và theo dõi giao dịch kho; đề nghị mua/thuê kho vẫn do HT duyệt. |
| 2.9 | Hồ sơ công ty, logo, thuế, địa chỉ và thông tin liên hệ. |
| 3.1 | CRUD sản phẩm SKU/barcode/đơn vị/ảnh, lô/hạn dùng/tình trạng, tồn tối thiểu, cảnh báo, kiểm kê sinh điều chỉnh, thu/chi/ngân sách kho. |
| 3.2 | PO nháp → gửi → duyệt → nhận hàng từng phần; đối chiếu số đặt/đã nhận/còn lại, ghi chênh lệch, tự hoàn tất PO khi nhận đủ. |
| 3.3 | Xuất bán/điều chuyển/hủy/trả NCC; duyệt giữ hàng, lấy hàng/đóng gói/in phiếu; chống xuất vượt tồn và giải phóng giữ khi hủy. |
| 3.4 | Vận đơn từ phiếu bán DONE; giao/ thất bại/ giao lại/ hoàn hàng; COD idempotent; nhận hàng hoàn vào lô mới sau kiểm tra, không cộng tồn trùng. |
| 3.5 | Sổ biến động không sửa/xóa; truy vết lô, người thao tác, thời gian và loại phiếu, gồm SALES_RETURN. |
| 3.6 | Hồ sơ kho, nhiều ảnh, địa chỉ và liên hệ; giới hạn CT chủ kho/QK được bàn giao. |
| 4.1 | Thông báo trong app, đọc/đếm chưa đọc; email có hàng đợi và retry; cảnh báo tồn/hạn định kỳ. Email thật cần SMTP. |
| 4.2 | Tìm kiếm/lọc/phân trang theo API; danh sách dạng array được lọc trên FE; thông báo có endpoint riêng. |
| 4.3 | Dashboard HT, CT và dashboard QK mới: số sản phẩm/lô/phiếu chờ/cảnh báo/phiếu theo trạng thái. Không cộng số lượng khác đơn vị thành tổng tồn gây hiểu nhầm. |
| 4.4 | Hồ sơ/avatar cá nhân, CT và kho; đổi mật khẩu; upload Cloudinary qua BE, không gửi secret ra FE. |
| 4.5 | Nhật ký core, audit finance, sổ biến động kho, lịch sử giao hàng và quyết định trên phiếu. |

### Những điểm sửa để FE và BE thống nhất

- Bản nền hiện tại thiếu phần lớn controller nghiệp vụ. Bổ sung lại các phần đã triển khai trong lịch sử Git; giữ các file/chức năng hiện có, không reset nhánh hay xóa lịch sử Git.
- Đăng ký không tự đăng nhập khi công ty chưa duyệt. Lưu taxCode; có lựa chọn tự phân loại theo businessDescription.
- Dùng JWT đúng response BE; giữ /login, /register và /LandingPage; bổ sung route theo vai trò, upload ảnh và thông báo lỗi thực.
- QK được lập điều chuyển từ kho mình sang kho của QK khác trong cùng CT. Kiểm tra quyền ở kho nguồn và cùng công ty ở đích, không yêu cầu QK quản lý cả hai kho. Danh mục đích chỉ trả id/sku/name/unit.
- Bổ sung /storehouse/dashboard và /storehouse/transfers; giữ /storehouse/inventory và các route cũ.
- Vận đơn RETURNED không tự tăng tồn. Người dùng bấm Nhập hàng hoàn sau khi kiểm đếm/kiểm tra, chọn DAMAGED hoặc OK. Backend kiểm tra trạng thái vận đơn với delivery và khóa phiếu nguồn để chỉ nhập một lần.
- Gateway Spring Cloud 2025.1 dùng spring.cloud.gateway.server.webflux; prefix /api/core, /api/inventory, /api/finance, /api/delivery được giữ đến gateway rồi StripPrefix=2.

## B. API và luồng nghiệp vụ chi tiết


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

## Bổ sung đồng bộ ngày 13/11/2026

- Đăng ký nhận taxCode và lưu vào companies.profile.taxCode; giữ trường mã số thuế của giao diện cũ. businessDescription dùng tự phân loại khi businessModel bỏ trống.
- GET /api/inventory/warehouses/{warehouseId}/reports/summary: số sản phẩm, lô, phiếu chờ duyệt, cảnh báo và số phiếu theo trạng thái. FE có /storehouse/dashboard.
- GET /api/inventory/warehouses/{warehouseId}/transfer-products?targetWarehouseId=UUID: chỉ trả id, sku, name, unit ở kho nhận cùng công ty. Không trả tồn hoặc lịch sử kho của người khác.
- Quản lý kho được tạo và hoàn tất điều chuyển từ kho mình sang kho khác cùng công ty; công ty/hệ thống duyệt. Quyền công ty được kiểm tra lại khi tạo, duyệt và hoàn tất; không cần quản lý cả hai kho. FE có /storehouse/transfers.
- API cũ vẫn giữ; bổ sung các màn hình nghiệp vụ và alias URL, không xóa các component cũ đang có trong bản nền. Endpoint tự đăng ký quản lý kho không được mở cho công chúng vì trái yêu cầu chỉ công ty cấp tài khoản.

## 8. Nhập hàng hoàn sau giao thất bại

POST /api/inventory/warehouses/{warehouseId}/sales-returns — CT/QK được quyền kho nguồn.

Body: {"shipmentId":"UUID","condition":"DAMAGED","note":"Đã kiểm tra hàng hoàn"}. condition chỉ OK hoặc DAMAGED; FE mặc định DAMAGED để hàng chưa kiểm tra không trở thành tồn có thể bán.

Inventory gọi GET delivery/warehouses/{warehouseId}/shipments/{shipmentId} bằng token người dùng. Phải đúng kho và RETURNED; phiếu nguồn phải EXPORT_SALE/DONE. Tạo RECEIPT/DONE, lô RET-{shipmentId}-{số dòng}, giữ hạn dùng và nguồn lô, ghi movement SALES_RETURN. Không sửa/xóa lô gốc. Ghi returnReceiptId/returnShipmentId trong approval của phiếu bán. Khóa phiếu bán trong transaction: gửi lại trả cùng phiếu, không cộng lại tồn. Nếu delivery gián đoạn thì trả 503, không ghi tồn.

Luồng hiện nhận hoàn toàn bộ kiện theo phiếu xuất của vận đơn, không hỗ trợ giao một phần/hoàn một phần. Chưa tự tạo bút toán hoàn tiền hoặc hủy doanh thu/COD; tài chính xử lý bằng giao dịch thu/chi được cấp quyền. Lô/sản phẩm nguồn đã ngừng sử dụng cần được xử lý trước khi nhận hoàn. Đây là giới hạn nghiệp vụ cụ thể, không âm thầm thay đổi số liệu tài chính.

Biến DELIVERY_SERVICE_URL của inventory trỏ tới delivery-service (Docker đã cấu hình). Danh sách phiếu nhận hiển thị cả nhận PO và hàng hoàn; approval.source=SALES_RETURN để phân biệt.

## 9. Quy ước payload cho FE

| Nhóm | Nội dung chính |
| --- | --- |
| Sản phẩm kho | sku, barcode, name, unit, images: string[], minStock. Không sửa quantity trực tiếp. |
| Lô | lotCode, expiryDate; đổi tình trạng bằng PATCH condition?status=OK hoặc DAMAGED. Tồn chỉ đổi bằng phiếu. |
| PO | supplierId hoặc supplierName, expectedDeliveryDate, note, submitImmediately, lines:[{productId,qty,price}]. |
| Nhận PO | poId, completePo, note, lines:[{productId,receivedQty,lotCode,expiryDate,condition}]. |
| Xuất | type: EXPORT_SALE/EXPORT_TRANSFER/EXPORT_DESTROY/EXPORT_RETURN, targetWarehouseId cho transfer, lines:[{lotId,quantity,targetProductId}]. |
| Đích điều chuyển | GET transfer-products?targetWarehouseId trả array id/sku/name/unit; cùng công ty, không lộ tồn kho đích. |
| Kiểm kê | note, lines:[{productId,lotId,countedQuantity}]. Hoàn tất sinh phiếu ADJUST nếu có lệch. |
| Điều chỉnh | note, lines:[{lotId,delta}]. delta khác 0, cho phép âm/dương; phải duyệt và complete. |
| Ngân sách | warehouseId hoặc null toàn CT, period: YYYY-MM/YYYY/Q1-YYYY, allocated. |
| Thu chi | warehouseId, type:INCOME/EXPENSE, category:SALE/PURCHASE/TRANSFER/OTHER, amount, note; QK không ghi chi trực tiếp. |
| Đề nghị chi | warehouseId, category, amount, note; duyệt/từ chối dùng {note}. |
| Vận đơn | documentId, carrier, trackingCode, codAmount. PATCH status dùng {status,note,location}. |
| Dashboard kho | products, lots, pendingDocuments, alerts:{LOW_STOCK,NEAR_EXPIRY,EXPIRED}, documentsByStatus. |
| Hồ sơ người dùng | fullName, avatar, profile:{phone,address,...}. |

## 10. Phân quyền và trạng thái cần giữ thống nhất

- Chỉ HT tạo/sửa kho sàn và NCC; CT quản lý khách hàng/nhân viên của mình; QK chỉ sửa hàng trong kho được giao.
- CT/HT duyệt phiếu tồn và đề nghị chi; QK lập/gửi phiếu rồi thực hiện phiếu đã duyệt. Công ty không tự duyệt giao dịch mua/thuê kho.
- Công ty LOCKED/PENDING/DELETED hoặc user LOCKED không được tiếp tục dùng các API bằng token cũ.
- Bản ghi lịch sử và biến động không xóa cứng. Xóa công ty/kho/nhân viên/đối tác áp dụng trạng thái hoặc xóa mềm theo từng loại.
- Backend không có reset-password công khai. FE hướng dẫn hỗ trợ và có đổi mật khẩu khi đăng nhập; không giả báo gửi email reset.
- Cloudinary/SMTP có kiểm thử thay thế dịch vụ. Cần credential thật để xác nhận upload/gửi mail trên môi trường chạy.
- Bộ test mặc định dùng H2, một số test báo cáo PostgreSQL bỏ qua nếu chưa cấp database test riêng. Không chạy create-drop trên dữ liệu vận hành.

## Kết quả xác minh ngày 13/11/2026

| Kiểm tra | Kết quả |
| --- | --- |
| Gradle test toàn bộ 7 module | 115 test: 110 đạt, 5 bỏ qua do chưa có PostgreSQL test riêng, 0 thất bại. |
| Gateway | Kiểm tra có đủ 4 prefix core/inventory/finance/delivery và StripPrefix=2. |
| Inventory mới | Điều chuyển cùng công ty/khác công ty; dashboard; nhận hoàn, không nhập trùng, kiểm tra trạng thái/kho vận đơn và lỗi delivery. |
| FE build / lint | Đạt; đã tách trang giới thiệu, bundle workspace chính khoảng 397 kB, không còn cảnh báo chunk trên 500 kB. |
| Browser/API contract | 63 màn hình, 411 request API giả lập; đăng nhập/đăng ký chờ duyệt, phân quyền, nhân viên, multipart upload, PO/lịch sử nhận, điều chuyển/truy vết, COD/nhận hoàn, gallery, quý/ngân sách/chi, thông báo/nhật ký, bảo vệ form, xác nhận và mobile. API fixture chỉ nằm trong tests. |
| Docker Compose | Cấu hình hợp lệ. |
| Dịch vụ ngoài | Chưa xác nhận upload Cloudinary hoặc gửi SMTP thật; cần credential và môi trường chạy. |

Không có file chức năng hiện hữu bị xóa. Không sửa dữ liệu vận hành bằng test; test mặc định có DB H2 riêng. Việc kiểm thử FE bằng API giả lập xác minh hợp đồng giao diện, không thay thế một lượt kiểm thử end-to-end trên hệ thống PostgreSQL/Cloudinary/SMTP đang triển khai.

## C. Danh mục đầy đủ endpoint lấy từ controller

Danh mục dưới đây sinh từ source bằng node backend/scripts/update-api-catalog.mjs. Các action động trong URL được mở rộng thành từng endpoint; quyền và payload xem phần A/B và controller tương ứng. Các API /internal/* dùng khóa nội bộ, không gọi từ FE. Endpoint register-warehouse-manager được giữ để tương thích nhưng bị từ chối theo quy định chỉ CT cấp nhân viên.

<!-- API-CATALOG:START -->

Tổng: **145 endpoint** (đã mở rộng các action động).

| Method | URL qua gateway | Handler / source |
| --- | --- | --- |
| GET | `/api/core/approvals` | [CompanyWorkspaceController.approvals](core-service/src/main/java/com/example/core_service/controller/CompanyWorkspaceController.java) |
| POST | `/api/core/auth/login` | [AuthController.login](core-service/src/main/java/com/example/core_service/controller/AuthController.java) |
| GET | `/api/core/auth/me` | [AuthController.me](core-service/src/main/java/com/example/core_service/controller/AuthController.java) |
| POST | `/api/core/auth/register-company` | [AuthController.registerCompany](core-service/src/main/java/com/example/core_service/controller/AuthController.java) |
| POST | `/api/core/auth/register-warehouse-manager` | [AuthController.registerWarehouseManager](core-service/src/main/java/com/example/core_service/controller/AuthController.java) |
| GET | `/api/core/companies` | [CompanyController.getAllCompanies](core-service/src/main/java/com/example/core_service/controller/CompanyController.java) |
| DELETE | `/api/core/companies/{id}` | [CompanyLifecycleController.delete](core-service/src/main/java/com/example/core_service/controller/CompanyLifecycleController.java) |
| GET | `/api/core/companies/{id}` | [CompanyController.getCompanyById](core-service/src/main/java/com/example/core_service/controller/CompanyController.java) |
| PUT | `/api/core/companies/{id}` | [CompanyController.updateCompanyProfile](core-service/src/main/java/com/example/core_service/controller/CompanyController.java) |
| PUT | `/api/core/companies/{id}/lock` | [CompanyController.lockCompany](core-service/src/main/java/com/example/core_service/controller/CompanyController.java) |
| PATCH | `/api/core/companies/{id}/status` | [CompanyController.updateCompanyStatus](core-service/src/main/java/com/example/core_service/controller/CompanyController.java) |
| PUT | `/api/core/companies/{id}/unlock` | [CompanyController.unlockCompany](core-service/src/main/java/com/example/core_service/controller/CompanyController.java) |
| GET | `/api/core/companies/my-company` | [CompanyController.getMyCompany](core-service/src/main/java/com/example/core_service/controller/CompanyController.java) |
| GET | `/api/core/customers` | [PartnerController.list](core-service/src/main/java/com/example/core_service/controller/PartnerController.java) |
| POST | `/api/core/customers` | [PartnerController.create](core-service/src/main/java/com/example/core_service/controller/PartnerController.java) |
| DELETE | `/api/core/customers/{id}` | [PartnerController.delete](core-service/src/main/java/com/example/core_service/controller/PartnerController.java) |
| GET | `/api/core/customers/{id}` | [PartnerController.get](core-service/src/main/java/com/example/core_service/controller/PartnerController.java) |
| PUT | `/api/core/customers/{id}` | [PartnerController.update](core-service/src/main/java/com/example/core_service/controller/PartnerController.java) |
| GET | `/api/core/employees` | [AccountController.employees](core-service/src/main/java/com/example/core_service/controller/AccountController.java) |
| POST | `/api/core/employees` | [AccountController.create](core-service/src/main/java/com/example/core_service/controller/AccountController.java) |
| DELETE | `/api/core/employees/{id}` | [AccountController.removeEmployee](core-service/src/main/java/com/example/core_service/controller/AccountController.java) |
| GET | `/api/core/employees/{id}` | [AccountController.employee](core-service/src/main/java/com/example/core_service/controller/AccountController.java) |
| PATCH | `/api/core/employees/{id}` | [AccountController.update](core-service/src/main/java/com/example/core_service/controller/AccountController.java) |
| POST | `/api/core/internal/inventory-alerts` | [InventoryAlertController.receive](core-service/src/main/java/com/example/core_service/controller/InventoryAlertController.java) |
| GET | `/api/core/notifications` | [NotificationController.getMyNotifications](core-service/src/main/java/com/example/core_service/controller/NotificationController.java) |
| PATCH | `/api/core/notifications/{id}/read` | [NotificationController.markAsRead](core-service/src/main/java/com/example/core_service/controller/NotificationController.java) |
| PATCH | `/api/core/notifications/read-all` | [NotificationController.markAllAsRead](core-service/src/main/java/com/example/core_service/controller/NotificationController.java) |
| GET | `/api/core/notifications/unread-count` | [NotificationController.getUnreadCount](core-service/src/main/java/com/example/core_service/controller/NotificationController.java) |
| GET | `/api/core/reports/companies/rankings` | [SystemReportController.rankings](core-service/src/main/java/com/example/core_service/controller/SystemReportController.java) |
| GET | `/api/core/reports/company` | [CompanyWorkspaceController.dashboard](core-service/src/main/java/com/example/core_service/controller/CompanyWorkspaceController.java) |
| GET | `/api/core/reports/system` | [SystemReportController.summary](core-service/src/main/java/com/example/core_service/controller/SystemReportController.java) |
| GET | `/api/core/suppliers` | [PartnerController.list](core-service/src/main/java/com/example/core_service/controller/PartnerController.java) |
| POST | `/api/core/suppliers` | [PartnerController.create](core-service/src/main/java/com/example/core_service/controller/PartnerController.java) |
| DELETE | `/api/core/suppliers/{id}` | [PartnerController.delete](core-service/src/main/java/com/example/core_service/controller/PartnerController.java) |
| GET | `/api/core/suppliers/{id}` | [PartnerController.get](core-service/src/main/java/com/example/core_service/controller/PartnerController.java) |
| PUT | `/api/core/suppliers/{id}` | [PartnerController.update](core-service/src/main/java/com/example/core_service/controller/PartnerController.java) |
| GET | `/api/core/suppliers/{id}/products` | [PartnerController.products](core-service/src/main/java/com/example/core_service/controller/PartnerController.java) |
| POST | `/api/core/suppliers/{id}/products` | [PartnerController.add](core-service/src/main/java/com/example/core_service/controller/PartnerController.java) |
| DELETE | `/api/core/suppliers/{id}/products/{productId}` | [PartnerController.deleteProduct](core-service/src/main/java/com/example/core_service/controller/PartnerController.java) |
| PUT | `/api/core/suppliers/{id}/products/{productId}` | [PartnerController.updateProduct](core-service/src/main/java/com/example/core_service/controller/PartnerController.java) |
| GET | `/api/core/system-logs` | [SystemLogController.getSystemLogs](core-service/src/main/java/com/example/core_service/controller/SystemLogController.java) |
| GET | `/api/core/system-logs/{id}` | [SystemLogController.getLogById](core-service/src/main/java/com/example/core_service/controller/SystemLogController.java) |
| GET | `/api/core/system-logs/my-company` | [SystemLogController.getMyCompanyLogs](core-service/src/main/java/com/example/core_service/controller/SystemLogController.java) |
| GET | `/api/core/system-logs/my-company/statistics` | [SystemLogController.getMyCompanyDailyStatistics](core-service/src/main/java/com/example/core_service/controller/SystemLogController.java) |
| GET | `/api/core/system-logs/statistics` | [SystemLogController.getDailyStatistics](core-service/src/main/java/com/example/core_service/controller/SystemLogController.java) |
| DELETE | `/api/core/upload/image` | [UploadController.deleteImage](core-service/src/main/java/com/example/core_service/controller/UploadController.java) |
| POST | `/api/core/upload/image` | [UploadController.uploadImage](core-service/src/main/java/com/example/core_service/controller/UploadController.java) |
| GET | `/api/core/users/me` | [AccountController.me](core-service/src/main/java/com/example/core_service/controller/AccountController.java) |
| PUT | `/api/core/users/me` | [AccountController.profile](core-service/src/main/java/com/example/core_service/controller/AccountController.java) |
| PUT | `/api/core/users/me/password` | [AccountController.password](core-service/src/main/java/com/example/core_service/controller/AccountController.java) |
| GET | `/api/core/warehouse-transactions` | [WarehouseTransactionController.list](core-service/src/main/java/com/example/core_service/controller/WarehouseTransactionController.java) |
| POST | `/api/core/warehouse-transactions` | [WarehouseTransactionController.create](core-service/src/main/java/com/example/core_service/controller/WarehouseTransactionController.java) |
| GET | `/api/core/warehouse-transactions/{id}` | [WarehouseTransactionController.detail](core-service/src/main/java/com/example/core_service/controller/WarehouseTransactionController.java) |
| POST | `/api/core/warehouse-transactions/{id}/approve` | [WarehouseTransactionController.approve](core-service/src/main/java/com/example/core_service/controller/WarehouseTransactionController.java) |
| POST | `/api/core/warehouse-transactions/{id}/approve-return` | [WarehouseTransactionController.approveReturn](core-service/src/main/java/com/example/core_service/controller/WarehouseTransactionController.java) |
| POST | `/api/core/warehouse-transactions/{id}/handover` | [WarehouseTransactionController.handover](core-service/src/main/java/com/example/core_service/controller/WarehouseTransactionController.java) |
| POST | `/api/core/warehouse-transactions/{id}/negotiations` | [WarehouseTransactionController.negotiate](core-service/src/main/java/com/example/core_service/controller/WarehouseTransactionController.java) |
| POST | `/api/core/warehouse-transactions/{id}/reject` | [WarehouseTransactionController.reject](core-service/src/main/java/com/example/core_service/controller/WarehouseTransactionController.java) |
| POST | `/api/core/warehouse-transactions/{id}/reject-return` | [WarehouseTransactionController.rejectReturn](core-service/src/main/java/com/example/core_service/controller/WarehouseTransactionController.java) |
| POST | `/api/core/warehouse-transactions/warehouses/{warehouseId}/return` | [WarehouseTransactionController.requestReturn](core-service/src/main/java/com/example/core_service/controller/WarehouseTransactionController.java) |
| GET | `/api/core/warehouses` | [WarehouseController.getWarehouses](core-service/src/main/java/com/example/core_service/controller/WarehouseController.java) |
| POST | `/api/core/warehouses` | [WarehouseController.createSystemWarehouse](core-service/src/main/java/com/example/core_service/controller/WarehouseController.java) |
| DELETE | `/api/core/warehouses/{id}` | [WarehouseProfileController.archive](core-service/src/main/java/com/example/core_service/controller/WarehouseProfileController.java) |
| GET | `/api/core/warehouses/{id}` | [WarehouseController.getWarehouseById](core-service/src/main/java/com/example/core_service/controller/WarehouseController.java) |
| PUT | `/api/core/warehouses/{id}` | [WarehouseProfileController.updateWarehouse](core-service/src/main/java/com/example/core_service/controller/WarehouseProfileController.java) |
| PUT | `/api/core/warehouses/{id}/profile` | [WarehouseProfileController.update](core-service/src/main/java/com/example/core_service/controller/WarehouseProfileController.java) |
| GET | `/api/core/warehouses/my-company` | [WarehouseProfileController.mine](core-service/src/main/java/com/example/core_service/controller/WarehouseProfileController.java) |
| GET | `/api/delivery/warehouses/{warehouseId}/shipments` | [ShipmentController.list](delivery-service/src/main/java/com/example/delivery_service/controller/ShipmentController.java) |
| POST | `/api/delivery/warehouses/{warehouseId}/shipments` | [ShipmentController.create](delivery-service/src/main/java/com/example/delivery_service/controller/ShipmentController.java) |
| GET | `/api/delivery/warehouses/{warehouseId}/shipments/{id}` | [ShipmentController.get](delivery-service/src/main/java/com/example/delivery_service/controller/ShipmentController.java) |
| PATCH | `/api/delivery/warehouses/{warehouseId}/shipments/{id}` | [ShipmentController.update](delivery-service/src/main/java/com/example/delivery_service/controller/ShipmentController.java) |
| POST | `/api/delivery/warehouses/{warehouseId}/shipments/{id}/cod/collect` | [ShipmentController.collect](delivery-service/src/main/java/com/example/delivery_service/controller/ShipmentController.java) |
| PATCH | `/api/delivery/warehouses/{warehouseId}/shipments/{id}/status` | [ShipmentController.status](delivery-service/src/main/java/com/example/delivery_service/controller/ShipmentController.java) |
| GET | `/api/finance/audit-logs` | [FinanceAuditController.list](finance-service/src/main/java/com/example/finance_service/controller/FinanceAuditController.java) |
| GET | `/api/finance/budgets` | [BudgetController.list](finance-service/src/main/java/com/example/finance_service/controller/BudgetController.java) |
| POST | `/api/finance/budgets` | [BudgetController.create](finance-service/src/main/java/com/example/finance_service/controller/BudgetController.java) |
| PUT | `/api/finance/budgets/{id}` | [BudgetController.update](finance-service/src/main/java/com/example/finance_service/controller/BudgetController.java) |
| GET | `/api/finance/expense-requests` | [ExpenseRequestController.list](finance-service/src/main/java/com/example/finance_service/controller/ExpenseRequestController.java) |
| POST | `/api/finance/expense-requests` | [ExpenseRequestController.create](finance-service/src/main/java/com/example/finance_service/controller/ExpenseRequestController.java) |
| POST | `/api/finance/expense-requests/{id}/approve` | [ExpenseRequestController.decide](finance-service/src/main/java/com/example/finance_service/controller/ExpenseRequestController.java) |
| POST | `/api/finance/expense-requests/{id}/reject` | [ExpenseRequestController.decide](finance-service/src/main/java/com/example/finance_service/controller/ExpenseRequestController.java) |
| POST | `/api/finance/internal/warehouse-charges` | [WarehouseChargeController.receive](finance-service/src/main/java/com/example/finance_service/controller/WarehouseChargeController.java) |
| GET | `/api/finance/reports/finance` | [FinanceReportController.summary](finance-service/src/main/java/com/example/finance_service/controller/FinanceReportController.java) |
| GET | `/api/finance/reports/finance/categories` | [FinanceReportController.categories](finance-service/src/main/java/com/example/finance_service/controller/FinanceReportController.java) |
| GET | `/api/finance/reports/finance/companies` | [FinanceRankingController.companies](finance-service/src/main/java/com/example/finance_service/controller/FinanceRankingController.java) |
| GET | `/api/finance/reports/finance/timeseries` | [FinanceReportController.timeseries](finance-service/src/main/java/com/example/finance_service/controller/FinanceReportController.java) |
| GET | `/api/finance/transactions` | [TransactionController.list](finance-service/src/main/java/com/example/finance_service/controller/TransactionController.java) |
| POST | `/api/finance/transactions` | [TransactionController.create](finance-service/src/main/java/com/example/finance_service/controller/TransactionController.java) |
| GET | `/api/inventory/warehouses/{warehouseId}/adjustments` | [StockAdjustmentController.list](inventory-service/src/main/java/com/example/inventory_service/controller/StockAdjustmentController.java) |
| POST | `/api/inventory/warehouses/{warehouseId}/adjustments` | [StockAdjustmentController.create](inventory-service/src/main/java/com/example/inventory_service/controller/StockAdjustmentController.java) |
| GET | `/api/inventory/warehouses/{warehouseId}/adjustments/{id}` | [StockAdjustmentController.get](inventory-service/src/main/java/com/example/inventory_service/controller/StockAdjustmentController.java) |
| POST | `/api/inventory/warehouses/{warehouseId}/adjustments/{id}/approve` | [StockAdjustmentController.transition](inventory-service/src/main/java/com/example/inventory_service/controller/StockAdjustmentController.java) |
| POST | `/api/inventory/warehouses/{warehouseId}/adjustments/{id}/cancel` | [StockAdjustmentController.transition](inventory-service/src/main/java/com/example/inventory_service/controller/StockAdjustmentController.java) |
| POST | `/api/inventory/warehouses/{warehouseId}/adjustments/{id}/complete` | [StockAdjustmentController.transition](inventory-service/src/main/java/com/example/inventory_service/controller/StockAdjustmentController.java) |
| POST | `/api/inventory/warehouses/{warehouseId}/adjustments/{id}/reject` | [StockAdjustmentController.transition](inventory-service/src/main/java/com/example/inventory_service/controller/StockAdjustmentController.java) |
| POST | `/api/inventory/warehouses/{warehouseId}/adjustments/{id}/submit` | [StockAdjustmentController.transition](inventory-service/src/main/java/com/example/inventory_service/controller/StockAdjustmentController.java) |
| GET | `/api/inventory/warehouses/{warehouseId}/alerts` | [InventoryQueryController.alerts](inventory-service/src/main/java/com/example/inventory_service/controller/InventoryQueryController.java) |
| GET | `/api/inventory/warehouses/{warehouseId}/approvals` | [InventoryQueryController.approvals](inventory-service/src/main/java/com/example/inventory_service/controller/InventoryQueryController.java) |
| GET | `/api/inventory/warehouses/{warehouseId}/documents/{id}/print` | [InventoryQueryController.print](inventory-service/src/main/java/com/example/inventory_service/controller/InventoryQueryController.java) |
| GET | `/api/inventory/warehouses/{warehouseId}/exports` | [StockOutboundController.list](inventory-service/src/main/java/com/example/inventory_service/controller/StockOutboundController.java) |
| POST | `/api/inventory/warehouses/{warehouseId}/exports` | [StockOutboundController.create](inventory-service/src/main/java/com/example/inventory_service/controller/StockOutboundController.java) |
| GET | `/api/inventory/warehouses/{warehouseId}/exports/{id}` | [StockOutboundController.get](inventory-service/src/main/java/com/example/inventory_service/controller/StockOutboundController.java) |
| POST | `/api/inventory/warehouses/{warehouseId}/exports/{id}/approve` | [StockOutboundController.transition](inventory-service/src/main/java/com/example/inventory_service/controller/StockOutboundController.java) |
| POST | `/api/inventory/warehouses/{warehouseId}/exports/{id}/cancel` | [StockOutboundController.transition](inventory-service/src/main/java/com/example/inventory_service/controller/StockOutboundController.java) |
| POST | `/api/inventory/warehouses/{warehouseId}/exports/{id}/complete` | [StockOutboundController.transition](inventory-service/src/main/java/com/example/inventory_service/controller/StockOutboundController.java) |
| POST | `/api/inventory/warehouses/{warehouseId}/exports/{id}/pack` | [StockOutboundController.transition](inventory-service/src/main/java/com/example/inventory_service/controller/StockOutboundController.java) |
| POST | `/api/inventory/warehouses/{warehouseId}/exports/{id}/pick` | [StockOutboundController.transition](inventory-service/src/main/java/com/example/inventory_service/controller/StockOutboundController.java) |
| POST | `/api/inventory/warehouses/{warehouseId}/exports/{id}/reject` | [StockOutboundController.transition](inventory-service/src/main/java/com/example/inventory_service/controller/StockOutboundController.java) |
| POST | `/api/inventory/warehouses/{warehouseId}/exports/{id}/submit` | [StockOutboundController.transition](inventory-service/src/main/java/com/example/inventory_service/controller/StockOutboundController.java) |
| GET | `/api/inventory/warehouses/{warehouseId}/movements` | [InventoryQueryController.movements](inventory-service/src/main/java/com/example/inventory_service/controller/InventoryQueryController.java) |
| GET | `/api/inventory/warehouses/{warehouseId}/products` | [InventoryCatalogController.listProducts](inventory-service/src/main/java/com/example/inventory_service/controller/InventoryCatalogController.java) |
| POST | `/api/inventory/warehouses/{warehouseId}/products` | [InventoryCatalogController.createProduct](inventory-service/src/main/java/com/example/inventory_service/controller/InventoryCatalogController.java) |
| DELETE | `/api/inventory/warehouses/{warehouseId}/products/{productId}` | [InventoryCatalogController.deleteProduct](inventory-service/src/main/java/com/example/inventory_service/controller/InventoryCatalogController.java) |
| GET | `/api/inventory/warehouses/{warehouseId}/products/{productId}` | [InventoryCatalogController.getProduct](inventory-service/src/main/java/com/example/inventory_service/controller/InventoryCatalogController.java) |
| PUT | `/api/inventory/warehouses/{warehouseId}/products/{productId}` | [InventoryCatalogController.updateProduct](inventory-service/src/main/java/com/example/inventory_service/controller/InventoryCatalogController.java) |
| GET | `/api/inventory/warehouses/{warehouseId}/products/{productId}/lots` | [InventoryCatalogController.listLots](inventory-service/src/main/java/com/example/inventory_service/controller/InventoryCatalogController.java) |
| POST | `/api/inventory/warehouses/{warehouseId}/products/{productId}/lots` | [InventoryCatalogController.createLot](inventory-service/src/main/java/com/example/inventory_service/controller/InventoryCatalogController.java) |
| DELETE | `/api/inventory/warehouses/{warehouseId}/products/{productId}/lots/{lotId}` | [InventoryCatalogController.deleteLot](inventory-service/src/main/java/com/example/inventory_service/controller/InventoryCatalogController.java) |
| GET | `/api/inventory/warehouses/{warehouseId}/products/{productId}/lots/{lotId}` | [InventoryCatalogController.getLot](inventory-service/src/main/java/com/example/inventory_service/controller/InventoryCatalogController.java) |
| PUT | `/api/inventory/warehouses/{warehouseId}/products/{productId}/lots/{lotId}` | [InventoryCatalogController.updateLot](inventory-service/src/main/java/com/example/inventory_service/controller/InventoryCatalogController.java) |
| PATCH | `/api/inventory/warehouses/{warehouseId}/products/{productId}/lots/{lotId}/condition` | [InventoryCatalogController.updateLotCondition](inventory-service/src/main/java/com/example/inventory_service/controller/InventoryCatalogController.java) |
| GET | `/api/inventory/warehouses/{warehouseId}/purchase-orders` | [StockInboundController.listPurchaseOrders](inventory-service/src/main/java/com/example/inventory_service/controller/StockInboundController.java) |
| POST | `/api/inventory/warehouses/{warehouseId}/purchase-orders` | [StockInboundController.createPurchaseOrder](inventory-service/src/main/java/com/example/inventory_service/controller/StockInboundController.java) |
| GET | `/api/inventory/warehouses/{warehouseId}/purchase-orders/{poId}` | [StockInboundController.getPurchaseOrder](inventory-service/src/main/java/com/example/inventory_service/controller/StockInboundController.java) |
| PUT | `/api/inventory/warehouses/{warehouseId}/purchase-orders/{poId}` | [StockInboundController.updatePurchaseOrder](inventory-service/src/main/java/com/example/inventory_service/controller/StockInboundController.java) |
| POST | `/api/inventory/warehouses/{warehouseId}/purchase-orders/{poId}/approve` | [StockInboundController.approvePurchaseOrder](inventory-service/src/main/java/com/example/inventory_service/controller/StockInboundController.java) |
| POST | `/api/inventory/warehouses/{warehouseId}/purchase-orders/{poId}/cancel` | [StockInboundController.cancelPurchaseOrder](inventory-service/src/main/java/com/example/inventory_service/controller/StockInboundController.java) |
| GET | `/api/inventory/warehouses/{warehouseId}/purchase-orders/{poId}/receipts` | [StockInboundController.getReceiptsByPo](inventory-service/src/main/java/com/example/inventory_service/controller/StockInboundController.java) |
| POST | `/api/inventory/warehouses/{warehouseId}/purchase-orders/{poId}/reject` | [StockInboundController.rejectPurchaseOrder](inventory-service/src/main/java/com/example/inventory_service/controller/StockInboundController.java) |
| POST | `/api/inventory/warehouses/{warehouseId}/purchase-orders/{poId}/submit` | [StockInboundController.submitPurchaseOrder](inventory-service/src/main/java/com/example/inventory_service/controller/StockInboundController.java) |
| GET | `/api/inventory/warehouses/{warehouseId}/receipts` | [StockInboundController.listReceipts](inventory-service/src/main/java/com/example/inventory_service/controller/StockInboundController.java) |
| POST | `/api/inventory/warehouses/{warehouseId}/receipts` | [StockInboundController.createReceipt](inventory-service/src/main/java/com/example/inventory_service/controller/StockInboundController.java) |
| GET | `/api/inventory/warehouses/{warehouseId}/receipts/{receiptId}` | [StockInboundController.getReceipt](inventory-service/src/main/java/com/example/inventory_service/controller/StockInboundController.java) |
| GET | `/api/inventory/warehouses/{warehouseId}/reports/summary` | [InventoryQueryController.summary](inventory-service/src/main/java/com/example/inventory_service/controller/InventoryQueryController.java) |
| POST | `/api/inventory/warehouses/{warehouseId}/sales-returns` | [SalesReturnController.receive](inventory-service/src/main/java/com/example/inventory_service/controller/SalesReturnController.java) |
| GET | `/api/inventory/warehouses/{warehouseId}/snapshot` | [WarehouseSnapshotController.getWarehouseSnapshot](inventory-service/src/main/java/com/example/inventory_service/controller/WarehouseSnapshotController.java) |
| GET | `/api/inventory/warehouses/{warehouseId}/stocktakes` | [StocktakeController.list](inventory-service/src/main/java/com/example/inventory_service/controller/StocktakeController.java) |
| POST | `/api/inventory/warehouses/{warehouseId}/stocktakes` | [StocktakeController.create](inventory-service/src/main/java/com/example/inventory_service/controller/StocktakeController.java) |
| GET | `/api/inventory/warehouses/{warehouseId}/stocktakes/{id}` | [StocktakeController.get](inventory-service/src/main/java/com/example/inventory_service/controller/StocktakeController.java) |
| POST | `/api/inventory/warehouses/{warehouseId}/stocktakes/{id}/approve` | [StocktakeController.transition](inventory-service/src/main/java/com/example/inventory_service/controller/StocktakeController.java) |
| POST | `/api/inventory/warehouses/{warehouseId}/stocktakes/{id}/cancel` | [StocktakeController.transition](inventory-service/src/main/java/com/example/inventory_service/controller/StocktakeController.java) |
| POST | `/api/inventory/warehouses/{warehouseId}/stocktakes/{id}/complete` | [StocktakeController.transition](inventory-service/src/main/java/com/example/inventory_service/controller/StocktakeController.java) |
| POST | `/api/inventory/warehouses/{warehouseId}/stocktakes/{id}/reject` | [StocktakeController.transition](inventory-service/src/main/java/com/example/inventory_service/controller/StocktakeController.java) |
| POST | `/api/inventory/warehouses/{warehouseId}/stocktakes/{id}/submit` | [StocktakeController.transition](inventory-service/src/main/java/com/example/inventory_service/controller/StocktakeController.java) |
| GET | `/api/inventory/warehouses/{warehouseId}/transfer-products` | [TransferProductController.list](inventory-service/src/main/java/com/example/inventory_service/controller/TransferProductController.java) |

<!-- API-CATALOG:END -->

## D. Hoàn thiện giao diện FE

- Bổ sung bảng xem chi tiết, gallery ảnh, tiến độ phiếu, lịch sử nhận PO, truy vết trực tiếp theo lô.
- Bộ chọn tháng/quý/năm, lọc thu/chi và đề nghị chi, mức dùng ngân sách, tab so sánh công ty.
- Chuông thông báo chưa đọc; lọc/đọc chi tiết thông báo và thống kê nhật ký theo ngày.
- Hộp xác nhận xóa/vô hiệu hóa/COD; cảnh báo bỏ thay đổi form; giao diện nhận hàng hoàn hiển thị phiếu sau khi lưu.
- Bảng cuộn ngang và form một cột trên điện thoại. Tìm kiếm giới hạn trang được ghi rõ nếu API chưa hỗ trợ search.
- Hướng dẫn giao diện: [frontend/FEATURES.md](../frontend/FEATURES.md). Không thêm nút cho nghiệp vụ BE chưa có (hoàn một phần, hoàn tiền tự động).
