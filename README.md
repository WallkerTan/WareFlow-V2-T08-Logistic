# WareFlow-V2-T08-Logistic — Hướng dẫn chạy

Tài liệu này ghi lại **các lệnh đã chạy thử thành công** cho `core-service` (API đăng ký công ty + đăng nhập JWT) ở cả 2 chế độ: **chạy local (IntelliJ / Gradle)** và **chạy Docker**.

---

## 1. Yêu cầu môi trường

| Công cụ | Phiên bản | Ghi chú |
|---|---|---|
| JDK | 21 | `C:\Program Files\Java\jdk-21` hoặc `.jdks\ms-21.0.12.1` |
| Docker Desktop | 29.8.2+ | Kèm Docker Compose v2 (`v5.6.0`) |
| PostgreSQL | 16 | Chạy qua Docker (`wareflow-postgres`) |
| Gradle | 9.8.2 | Dùng wrapper `gradlew.bat`, không cần cài |

> Lưu ý: `core-service` **không bắt buộc** phải có Eureka/Config Server để chạy — cấu hình dùng `optional:configserver:...` nên app vẫn boot được nếu thiếu chúng (chỉ log warning).

---

## 2. Cổng (ports) dùng cho core-service

| Service | Port | Ghi chú |
|---|---|---|
| core-service (API) | `8081` | API chính cần test |
| PostgreSQL | `5432` | DB `wareflow_core` |
| Eureka Server | `8761` | Service discovery (tuỳ chọn) |
| Config Server | `8888` | Centralized config (tuỳ chọn) |
| API Gateway | `8080` | Chưa cần cho API/JWT |

---

## 3. Cách A — Chạy LOCAL (không cần Docker cho API)

### 3.1. Chạy PostgreSQL bằng Docker (duy nhất thứ cần Docker)

```powershell
cd C:\Users\HCLaptop.com\Downloads\WareFlow\WareFlow-V2-T08-Logistic
docker compose up -d postgres
docker compose ps          # phải thấy wareflow-postgres ở trạng thái "healthy"
```

Container này tự tạo 4 database nhờ script init:

```
wareflow_core
wareflow_inventory
wareflow_finance
wareflow_delivery
```

### 3.2. Build jar

```powershell
cd C:\Users\HCLaptop.com\Downloads\WareFlow\WareFlow-V2-T08-Logistic\backend
$env:JAVA_HOME="C:\Program Files\Java\jdk-21"
.\gradlew.bat :core-service:bootJar --console=plain
```

### 3.3. Chạy core-service

**Cách 1 — chạy nền bằng PowerShell:**

```powershell
cd C:\Users\HCLaptop.com\Downloads\WareFlow\WareFlow-V2-T08-Logistic\backend\core-service
$env:JAVA_HOME="C:\Program Files\Java\jdk-21"
Start-Process -FilePath "C:\Program Files\Java\jdk-21\bin\java.exe" `
  -ArgumentList "-jar","build\libs\core-service-0.0.1-SNAPSHOT.jar" `
  -RedirectStandardOutput "C:\Users\HCLaptop.com\Downloads\WareFlow\core-run.log" `
  -RedirectStandardError  "C:\Users\HCLaptop.com\Downloads\WareFlow\core-err.log" `
  -WindowStyle Hidden
```

**Cách 2 — chạy trong IntelliJ:** mở `CoreServiceApplication` và bấm Run. Chỉ cần bảo đảm `application.yml` trỏ `DB_HOST=localhost`, `DB_PORT=5432`, `DB_NAME=wareflow_core`, `DB_USER=postgres`, `DB_PASSWORD=postgres`.

### 3.4. Kiểm tra app đã sống

```powershell
curl.exe -s http://localhost:8081/actuator/health
# {"groups":["liveness","readiness"],"status":"UP"}
```

---

## 4. Cách B — Chạy DOCKER (full stack)

```powershell
cd C:\Users\HCLaptop.com\Downloads\WareFlow\WareFlow-V2-T08-Logistic

# 1) Build image (Dockerfile COPY từ build/libs, nên PHẢI build jar trước)
cd backend
$env:JAVA_HOME="C:\Program Files\Java\jdk-21"
.\gradlew.bat :core-service:bootJar --console=plain
cd ..

# 2) Build + chạy stack
docker compose build core-service
docker compose up -d postgres eureka-server config-server core-service

# 3) Theo dõi log
docker compose logs -f core-service
```

### Các lệnh Docker thường dùng

```powershell
# Trạng thái các container
docker compose ps

# Log 1 service
docker compose logs -f core-service
docker compose logs -f eureka-server

# Restart 1 service sau khi sửa code
docker compose build core-service
docker compose up -d --force-recreate core-service

# Dừng toàn bộ (giữ volume DB)
docker compose down

# Dừng toàn bộ và XÓA dữ liệu DB (reset sạch)
docker compose down -v

# Xem log core-service gần nhất
docker compose logs core-service --tail 50
```

> **Lưu ý:** `docker compose down -v` sẽ xoá volume `postgres_data`, mất toàn bộ dữ liệu đã đăng ký. Nếu chỉ muốn chạy lại app thì dùng `docker compose down` thôi.

---

## 5. Test API — Đăng ký công ty & Đăng nhập JWT

Các lệnh dưới đây đã được chạy và **PASS** (HTTP 201 / 200 / 401).

### 5.1. Đăng ký công ty mới (kèm tài khoản admin)

```powershell
cd C:\Users\HCLaptop.com\Downloads\WareFlow

$suffix = Get-Random -Minimum 10000 -Maximum 99999
$email  = "jwt$suffix@wareflow.vn"
$reg = '{"companyName":"CTY TEST ' + $suffix + '","businessModel":"TECH","email":"' + $email +
       '","password":"12345678","fullName":"Test User","phone":"0900000000","address":"HCM"}'
Set-Content -Path "jwt-reg.json" -Value $reg -Encoding UTF8 -NoNewline

curl.exe -s -X POST http://localhost:8081/auth/register-company `
  -H "Content-Type: application/json" --data-binary "@jwt-reg.json"
```

**Response (HTTP 201):**

```json
{
  "tokenType": "Bearer",
  "accessToken": "eyJhbGciOiJIUzM4NCJ9...",
  "expiresAt": "2026-10-28T22:44:16Z",
  "userId": "b1d686d7-67bd-4f8b-93fd-04d13bfc292a",
  "email": "jwt24273@wareflow.vn",
  "fullName": "Test User",
  "role": "COMPANY_ADMIN",
  "companyId": "0f0fbd21-f5b3-438c-9a72-bff3eeb0cf87",
  "companyName": "CTY TEST 24273"
}
```

> `companyName` phải **duy nhất** — nếu trùng sẽ trả `409 Conflict` với message `"Tên công ty đã tồn tại"`. Vì vậy hãy thêm hậu tố ngẫu nhiên như trên.

### 5.2. Đăng nhập (trả về JWT access token)

```powershell
$email = "jwt24273@wareflow.vn"   # email vừa đăng ký
Set-Content -Path "jwt-login.json" `
  -Value ('{"email":"' + $email + '","password":"12345678"}') -Encoding UTF8 -NoNewline

$resp = curl.exe -s -X POST http://localhost:8081/auth/login `
  -H "Content-Type: application/json" --data-binary "@jwt-login.json"
$resp
$token = ($resp | ConvertFrom-Json).accessToken
```

**Response (HTTP 200):** cùng cấu trúc với đăng ký, `accessToken` là JWT (HS384), hạn **8 giờ** (`PT8H`).

### 5.3. Gọi API có yêu cầu xác thực

```powershell
# Hợp lệ -> trả thông tin user hiện tại
curl.exe -s http://localhost:8081/auth/me -H "Authorization: Bearer $token"

# Không có token -> HTTP 401
curl.exe -s -o NUL -w "HTTP %{http_code}" http://localhost:8081/auth/me
```

### 5.4. Test tất cả trong 1 lệnh

```powershell
cd C:\Users\HCLaptop.com\Downloads\WareFlow
$suffix = Get-Random -Minimum 10000 -Maximum 99999
$email  = "jwt$suffix@wareflow.vn"
$reg = '{"companyName":"CTY TEST ' + $suffix + '","businessModel":"TECH","email":"' + $email +
       '","password":"12345678","fullName":"Test User"}'
Set-Content "jwt-reg.json" -Value $reg -Encoding UTF8 -NoNewline
Set-Content "jwt-login.json" -Value ('{"email":"' + $email + '","password":"12345678"}') -Encoding UTF8 -NoNewline

"### 1) REGISTER"
curl.exe -s -X POST http://localhost:8081/auth/register-company -H "Content-Type: application/json" --data-binary "@jwt-reg.json"
"`n### 2) LOGIN"
$resp = curl.exe -s -X POST http://localhost:8081/auth/login -H "Content-Type: application/json" --data-binary "@jwt-login.json"
$resp
"`n### 3) ME"
curl.exe -s http://localhost:8081/auth/me -H "Authorization: Bearer $(($resp | ConvertFrom-Json).accessToken)"
```

---

## 5A. Test API — Đăng ký Warehouse Manager (hồ sơ công ty / cá nhân)

Các lệnh dưới đây đã được chạy thử và **PASS** (HTTP 201 / 200 / 400 / 409).

### 5A.1. Đăng ký kèm hồ sơ công ty

```powershell
cd C:\Users\HCLaptop.com\Downloads\WareFlow
$suffix = Get-Random -Minimum 1000 -Maximum 9999
$email  = "wm$suffix@wareflow.vn"
$tax    = "0$suffix" + "1234567"     # 10 chữ số

$body = '{
  "email": "' + $email + '",
  "password": "12345678",
  "fullName": "Trần Quản Lý",
  "profileType": "COMPANY",
  "role": "WAREHOUSE_MANAGER",
  "companyProfile": {
    "companyName": "CTY WAREHOUSE ' + $suffix + '",
    "businessModel": "FOOD",
    "taxCode": "' + $tax + '",
    "phone": "0900000000",
    "address": "HCM"
  }
}'
Set-Content "wm-reg-company.json" -Value $body -Encoding UTF8 -NoNewline

curl.exe -s -X POST http://localhost:8081/auth/register-warehouse-manager `
  -H "Content-Type: application/json" --data-binary "@wm-reg-company.json"
```

**Response (HTTP 201):**

```json
{
  "tokenType": "Bearer",
  "accessToken": "eyJhbGciOiJIUzM4NCJ9...",
  "expiresAt": "2026-10-29T23:12:43Z",
  "userId": "b5e45aa5-2161-46fc-a383-1d8eab291fc4",
  "email": "wm3123@wareflow.vn",
  "fullName": "Trần Quản Lý",
  "role": "WAREHOUSE_MANAGER",
  "companyId": "01443521-ee4f-46ea-9164-a22ad5f807ad",
  "companyName": "CTY WAREHOUSE 3123"
}
```

### 5A.2. Đăng ký kèm hồ sơ cá nhân

```powershell
$body = '{
  "email": "cnn' + $suffix + '@wareflow.vn",
  "password": "12345678",
  "fullName": "Nguyễn Cá Nhân",
  "profileType": "INDIVIDUAL",
  "individualProfile": {
    "phone": "0900000001",
    "address": "Hà Nội",
    "idNumber": "012345678901",
    "dateOfBirth": "1990-01-01"
  }
}'
Set-Content "wm-reg-individual.json" -Value $body -Encoding UTF8 -NoNewline

curl.exe -s -X POST http://localhost:8081/auth/register-warehouse-manager `
  -H "Content-Type: application/json" --data-binary "@wm-reg-individual.json"
```

**Response (HTTP 201):** giống hệt, nhưng `companyId` và `companyName` là `null`.

### 5A.3. Hướng dẫn kiểm thử bằng Postman

1. Mở Postman → **New** → **HTTP Request**.
2. **Method**: `POST` · **URL**: `http://localhost:8081/auth/register-warehouse-manager`
3. **Headers**: `Content-Type: application/json`
4. **Body** → chọn **raw** → loại **JSON**, dán payload ở mục 5A.1 hoặc 5A.2.
5. Bấm **Send**. Kết quả mong đợi:
   - `201 Created` với `role` = `WAREHOUSE_MANAGER`, có `accessToken`.
   - Nhánh `COMPANY` → có `companyId` + `companyName`; nhánh `INDIVIDUAL` → `companyId` = `null`.
6. Copy `accessToken` → tab mới, `GET http://localhost:8081/auth/me` với header `Authorization: Bearer <accessToken>` → `200 OK`.
7. Test lỗi (đều trả JSON thống nhất, không có stack trace):
   - Gửi lại đúng payload đã đăng ký → `409` `"Email đã được đăng ký"`.
   - Đổi `role` thành `SYSTEM_ADMIN` → `400` `"Role không hợp lệ, chỉ hỗ trợ tạo tài khoản WAREHOUSE_MANAGER"`.
   - `profileType: "COMPANY"` nhưng bỏ `companyProfile` → `400` `"Hồ sơ công ty không được để trống khi đăng ký loại công ty"`.
   - `profileType: "INDIVIDUAL"` nhưng bỏ `individualProfile` → `400` `"Hồ sơ cá nhân không được để trống khi đăng ký loại cá nhân"`.
   - Gửi cả hai loại hồ sơ → `400` `"Không được gửi cả hồ sơ công ty và hồ sơ cá nhân"`.
   - `email` sai định dạng / `password` < 8 ký tự → `400` kèm `errors` chi tiết từng field.


---

## 6. Danh sách API hiện có

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| `POST` | `/auth/register-company` | Không | Đăng ký công ty + user `COMPANY_ADMIN`, trả luôn JWT |
| `POST` | `/auth/register-warehouse-manager` | Không | Đăng ký user `WAREHOUSE_MANAGER` kèm hồ sơ công ty hoặc cá nhân, trả luôn JWT |
| `POST` | `/auth/login` | Không | Đăng nhập bằng email + password, trả JWT |
| `GET` | `/auth/me` | Bearer | Thông tin user hiện tại |
| `GET` | `/actuator/health` | Không | Health check |

**Body đăng ký công ty (`RegisterCompanyRequest`):**

| Field | Bắt buộc | Ràng buộc |
|---|---|---|
| `companyName` | Có | tối đa 255 ký tự, **phải duy nhất** |
| `businessModel` | Có | enum `CompanyBusinessModel` (vd: `TECH`) |
| `email` | Có | định dạng email, tối đa 255 |
| `password` | Có | **tối thiểu 8** ký tự, tối đa 100 |
| `fullName` | Có | tối đa 255 |
| `phone` | Không | tối đa 50 |
| `address` | Không | tối đa 500 |

**Body đăng ký Warehouse Manager (`RegisterWarehouseManagerRequest`):**

| Field | Bắt buộc | Ràng buộc |
|---|---|---|
| `email` | Có | định dạng email, tối đa 255, **duy nhất** |
| `password` | Có | **tối thiểu 8** ký tự, tối đa 100 |
| `fullName` | Có | tối đa 255 |
| `profileType` | Không | enum `ProfileType` = `COMPANY` \| `INDIVIDUAL` (mặc định `INDIVIDUAL`) |
| `role` | Không | chỉ chấp nhận `WAREHOUSE_MANAGER` (mặc định `WAREHOUSE_MANAGER`) |
| `companyProfile` | Khi `COMPANY` | xem bảng dưới |
| `individualProfile` | Khi `INDIVIDUAL` | xem bảng dưới |

`companyProfile` (`CompanyProfileRequest`): `companyName` (bắt buộc, duy nhất), `businessModel` (bắt buộc, enum `CompanyBusinessModel`), `taxCode` (tuỳ chọn, 10 hoặc 13 chữ số, duy nhất), `phone`, `address`.

`individualProfile` (`IndividualProfileRequest`): `phone` (bắt buộc), `address`, `idNumber`, `dateOfBirth`.

> Không được gửi đồng thời cả hai loại hồ sơ. Hồ sơ công ty được lưu vào bảng `companies`
> (kèm `taxCode`/`phone`/`address` trong `companies.profile` jsonb) và tài khoản được liên kết
> vào công ty đó. Hồ sơ cá nhân được lưu trong `users.profile` jsonb và tài khoản **không**
> thuộc công ty nào (`companyId` = `null`).

**Mã lỗi trả về (thống nhất với `GlobalExceptionHandler`):**

| HTTP | Message |
|---|---|
| `400` | `Role không hợp lệ, chỉ hỗ trợ tạo tài khoản WAREHOUSE_MANAGER` |
| `400` | `Hồ sơ công ty không được để trống khi đăng ký loại công ty` |
| `400` | `Hồ sơ cá nhân không được để trống khi đăng ký loại cá nhân` |
| `400` | `Không được gửi cả hồ sơ công ty và hồ sơ cá nhân` |
| `400` | Lỗi validation field (body có kèm mảng `errors` chi tiết từng field) |
| `409` | `Email đã được đăng ký` / `Tên công ty đã tồn tại` / `Mã số thuế đã được đăng ký` |
| `500` | `Đã xảy ra lỗi hệ thống, vui lòng thử lại` (không lộ stack trace) |


**Cấu hình JWT** (biến môi trường, override được):

| Biến | Mặc định |
|---|---|
| `JWT_SECRET` | Base64 32 bytes (`C3VyZS1uZWVkcy1hLXNlY3JldC1rZXktbWluaW11bS0zMi1ieXRlcy1sb25nISE=`) |
| `wareflow.jwt.access-token-ttl` | `PT8H` (8 giờ) |
| `wareflow.jwt.issuer` | `wareflow-auth` |

---

## 7. Xử lý sự cố

| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| `Connection refused` tới `localhost:8761` | Chưa có Eureka | Vô hại — chỉ log warning. Chạy `docker compose up -d eureka-server` nếu cần gateway/discovery |
| `Connection refused` tới `localhost:8888` | Chưa có Config Server | Vô hại — dùng `optional:` nên app vẫn boot. `docker compose up -d config-server` |
| `PSQLException: database "wareflow_core" does not exist` | Volume Postgres cũ, chưa chạy init script | `docker compose down -v` rồi `docker compose up -d postgres` |
| `409 Conflict — Tên công ty đã tồn tại` | Trùng `companyName` | Thêm hậu tố ngẫu nhiên vào tên công ty |
| `docker compose build` lỗi `COPY failed: no source files were specified` | Chưa build jar | Chạy `.\gradlew.bat :core-service:bootJar` trước khi build image |
| Port 8081 đã bị chiếm | App cũ còn chạy | `Get-NetTCPConnection -LocalPort 8081 -State Listen` rồi `Stop-Process -Id <pid> -Force` |
| `Dockerfile` copy nhầm file `-plain.jar` | Có 2 file jar trong `build/libs` | Xoá `*-plain.jar` hoặc dùng `COPY build/libs/*-SNAPSHOT.jar app.jar` |

---

## 8. Trạng thái Git hiện tại

```
Branch : nguyen-be
Commit : 042df08  CORE-08, CORE-09 - API Dang ky cong ty + Dang nhap JWT
Remote : fork   https://github.com/nguyenbabie1/WareFlow-V2-T08-Logistic.git
         origin https://github.com/WallkerTan/WareFlow-V2-T08-Logistic.git
```

Nội dung commit gồm 19 file / 956 dòng: `AuthController`, `AuthService`, `JwtTokenProvider`, `JwtAuthenticationFilter`, `SecurityConfig`, `JwtProperties`, `GlobalExceptionHandler`, các DTO request/response, repository `Company`/`User`, test `AuthControllerTests`, cộng cấu hình `application.yml` và `docker-compose.yml`.
