# FE-15 — PO và nhận hàng / INV-08

Routes: `/storehouse/inbound` và `/storehouse/inbound/new`, trong STOREHOUSE-layout.

## Kết nối

- `VITE_INVENTORY_API_BASE_URL`: URL gốc inventory-service hoặc gateway có route `/warehouses/...`. Nếu thiếu, dùng `VITE_API_BASE_URL`, rồi `/api`.
- `VITE_WAREHOUSE_ID`: UUID kho mặc định tùy chọn. Người dùng có thể nhập UUID kho được phân quyền; lựa chọn lưu trong sessionStorage. Backend vẫn kiểm tra quyền kho.
- Bearer token lấy từ phiên `wareflow.auth` hiện có. Không lưu token mới.
- Nhà cung cấp: nhập tên hoặc chọn gợi ý từ các PO trong trang hiện tại. Chưa có API danh mục nhà cung cấp; không dùng ID giả từ dữ liệu mẫu.

## Contract đang dùng (đối chiếu code backend INV-08)

GET `/warehouses/{warehouseId}/purchase-orders?page=0&size=10&status=APPROVED`

Response Spring Page: `{ content: StockDocumentResponse[], totalElements, totalPages }`. Bỏ status khi xem tất cả.

GET `/warehouses/{warehouseId}/purchase-orders/{poId}` trả chi tiết mới nhất trước khi nhận hàng.

GET `/warehouses/{warehouseId}/products?page=0&size=100` trả Spring Page. Frontend tải các trang để chọn sản phẩm.

POST `/warehouses/{warehouseId}/purchase-orders`

```json
{
  "supplierName": "Nhà cung cấp A",
  "expectedDeliveryDate": "2026-11-10",
  "note": "Giao buổi sáng",
  "submitImmediately": true,
  "lines": [{ "productId": "<UUID>", "qty": 10, "price": 20000 }]
}
```

`supplierId` là tùy chọn trên backend, chỉ bổ sung khi có API nhà cung cấp thực tế. Ngày rỗng được bỏ khỏi payload.

POST `/warehouses/{warehouseId}/purchase-orders/{poId}/submit` với `{}` cho PO DRAFT.

POST `/warehouses/{warehouseId}/receipts`

```json
{
  "poId": "<UUID>",
  "note": "Nhận đợt 1",
  "completePo": true,
  "lines": [{ "productId": "<UUID>", "receivedQty": 7, "lotCode": "LOT-01", "expiryDate": "2027-11-10" }]
}
```

Chỉ gửi dòng có thực nhận > 0. Mã lô bắt buộc, hạn sử dụng tùy chọn. Không gửi condition để dùng mặc định backend. Backend không cho nhận vượt phần còn lại. Chênh lệch hiển thị = thực nhận lần này − (qty − receivedQty đã nhận). `completePo: true` chỉ hoàn tất khi mọi dòng đã nhận đủ; nhận thiếu vẫn giữ APPROVED.

POST trả StockDocumentResponse (201 khi tạo). Dữ liệu PO có `id`, `status`, `createdAt`, `lines` và `approval`. `lines`: productId, productName, sku, unit, qty, price, receivedQty. `approval`: supplierName, totalAmount, expectedDeliveryDate, note. Các số JSON được xử lý như number. Trạng thái: DRAFT, PENDING_APPROVAL, APPROVED, DONE, CANCELLED. Chỉ APPROVED có thao tác nhận hàng.

## Cần Nguyên và Tân xác nhận khi tích hợp

- URL gateway cho inventory-service và nguồn warehouseId của tài khoản kho.
- API danh mục nhà cung cấp, quyền truy cập và mapping supplierId/name.
- Giữ Spring Page và metadata approval như DTO hiện tại; lỗi hỗ trợ detail/message.
- Hành vi duyệt PO và nhận thiếu/nhiều đợt theo StockInboundService hiện tại.

Tài liệu này ghi lại contract từ mã nguồn; chưa có xác nhận trực tiếp từ Nguyên/Tân.
