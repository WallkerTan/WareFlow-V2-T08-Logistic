package com.example.core_service.controller;

import com.example.core_service.dto.request.CreateWarehouseTransactionRequest;
import com.example.core_service.dto.request.HandoverWarehouseRequest;
import com.example.core_service.dto.request.NegotiateWarehouseTransactionRequest;
import com.example.core_service.dto.request.ReturnWarehouseRequest;
import com.example.core_service.dto.response.WarehouseTransactionResponse;
import com.example.core_service.entity.enums.WarehouseTransactionStatus;
import com.example.core_service.service.WarehouseTransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * API quản lý giao dịch kho (mua, thuê, bàn giao, trả kho).
 *
 * Base path (qua gateway): /api/core/warehouse-transactions
 */
@RestController
@RequestMapping("/warehouse-transactions")
@RequiredArgsConstructor
public class WarehouseTransactionController {

    private final WarehouseTransactionService transactionService;
    @GetMapping("/{id}") @PreAuthorize("isAuthenticated()")
    public WarehouseTransactionResponse detail(@PathVariable UUID id){return transactionService.detail(id);}

    // ──────────────────────────────────────────────────────────────────────────
    // TẠO ĐỀ NGHỊ MUA / THUÊ KHO
    // POST /api/core/warehouse-transactions
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * COMPANY_ADMIN hoặc WAREHOUSE_MANAGER gửi đề nghị mua/thuê kho.
     * Kho phải đang ở trạng thái AVAILABLE và đúng loại (BUY / RENT).
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public WarehouseTransactionResponse create(
            @Valid @RequestBody CreateWarehouseTransactionRequest request
    ) {
        return transactionService.create(request);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // DANH SÁCH GIAO DỊCH
    // GET /api/core/warehouse-transactions
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Xem danh sách giao dịch:
     * - SYSTEM_ADMIN: xem tất cả
     * - COMPANY_ADMIN/WAREHOUSE_MANAGER: chỉ xem giao dịch của công ty mình
     *
     * Query params: status (tuỳ chọn), page, size, sort
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public Page<WarehouseTransactionResponse> list(
            @RequestParam(required = false) WarehouseTransactionStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return transactionService.list(status, pageable);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // THƯƠNG LƯỢNG GIÁ
    // POST /api/core/warehouse-transactions/{id}/negotiations
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Người tham gia giao dịch (cả hai phía) gửi tin nhắn thương lượng giá.
     */
    @PostMapping("/{id}/negotiations")
    @PreAuthorize("isAuthenticated()")
    public WarehouseTransactionResponse negotiate(
            @PathVariable UUID id,
            @Valid @RequestBody NegotiateWarehouseTransactionRequest request
    ) {
        return transactionService.negotiate(id, request);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // DUYỆT GIAO DỊCH MUA / THUÊ → CHUYỂN QUYỀN SỞ HỮU KHO
    // POST /api/core/warehouse-transactions/{id}/approve
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * SYSTEM_ADMIN duyệt giao dịch mua/thuê:
     * - Chuyển owner_company_id → công ty mua/thuê
     * - Đổi status kho → ACTIVE
     * - Đổi status giao dịch → COMPLETED
     * - Ghi log + tạo notifications
     */
    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'COMPANY_ADMIN')")
    public WarehouseTransactionResponse approve(@PathVariable UUID id) {
        return transactionService.approve(id);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TỪ CHỐI GIAO DỊCH MUA / THUÊ
    // POST /api/core/warehouse-transactions/{id}/reject
    // ──────────────────────────────────────────────────────────────────────────

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'COMPANY_ADMIN')")
    public WarehouseTransactionResponse reject(
            @PathVariable UUID id,
            @RequestParam(required = false) String reason
    ) {
        return transactionService.reject(id, reason);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // BÀN GIAO KHO: GÁN NHÂN VIÊN QUẢN LÝ + LƯU SNAPSHOT TỒN KHO
    // POST /api/core/warehouse-transactions/{id}/handover
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * COMPANY_ADMIN thực hiện bàn giao kho sau khi giao dịch đã COMPLETED:
     * 1. Chọn warehouse_manager trong công ty
     * 2. Lấy snapshot tồn kho từ inventory-service
     * 3. Lưu vào warehouses.handover (JSONB)
     * 4. Ghi log + thông báo manager và system
     *
     * Body: { "managerId": "uuid", "note": "ghi chú tuỳ chọn" }
     */
    @PostMapping("/{id}/handover")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public WarehouseTransactionResponse handover(
            @PathVariable UUID id,
            @Valid @RequestBody HandoverWarehouseRequest request
    ) {
        return transactionService.handover(id, request);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // YÊU CẦU TRẢ KHO
    // POST /api/core/warehouse-transactions/warehouses/{warehouseId}/return
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * COMPANY_ADMIN yêu cầu trả kho về hệ thống.
     * Tạo giao dịch type=RETURN, status=PENDING.
     * Kho phải đang ở trạng thái ACTIVE.
     *
     * Body: { "reason": "lý do trả kho" }
     */
    @PostMapping("/warehouses/{warehouseId}/return")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public WarehouseTransactionResponse requestReturn(
            @PathVariable UUID warehouseId,
            @RequestBody(required = false) ReturnWarehouseRequest request
    ) {
        return transactionService.requestReturn(warehouseId,
                request != null ? request : new ReturnWarehouseRequest());
    }

    // ──────────────────────────────────────────────────────────────────────────
    // DUYỆT TRẢ KHO
    // POST /api/core/warehouse-transactions/{id}/approve-return
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * SYSTEM_ADMIN duyệt yêu cầu trả kho:
     * - Kho RENT → status AVAILABLE (tái sử dụng)
     * - Kho BUY → status RETURNED (lưu trữ)
     * - Xoá ownerCompany + handover
     * - Ghi log + notifications
     */
    @PostMapping("/{id}/approve-return")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public WarehouseTransactionResponse approveReturn(@PathVariable UUID id) {
        return transactionService.approveReturn(id);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TỪ CHỐI TRẢ KHO
    // POST /api/core/warehouse-transactions/{id}/reject-return
    // ──────────────────────────────────────────────────────────────────────────

    @PostMapping("/{id}/reject-return")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public WarehouseTransactionResponse rejectReturn(
            @PathVariable UUID id,
            @RequestParam(required = false) String reason
    ) {
        return transactionService.rejectReturn(id, reason);
    }
}
