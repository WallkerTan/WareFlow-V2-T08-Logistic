package com.example.inventory_service.controller;

import com.example.inventory_service.dto.*;
import com.example.inventory_service.entity.enums.StockDocumentStatus;
import com.example.inventory_service.security.WarehouseAccessService;
import com.example.inventory_service.security.WarehouseAccessService.UserIdentity;
import com.example.inventory_service.service.StockInboundService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Controller xử lý luồng nhập hàng (INV-08):
 *  1. Đơn đặt hàng (Purchase Order - PO): Tạo, gửi duyệt, phê duyệt qua trung tâm công ty (mục 2.8)
 *  2. Nhận hàng (Receipt): Đối chiếu với PO, ghi nhận chênh lệch, cộng/tạo mới stock_lots
 */
@RestController
@RequestMapping("/warehouses/{warehouseId}")
@RequiredArgsConstructor
public class StockInboundController {

    private final StockInboundService inboundService;
    private final WarehouseAccessService access;

    // ─────────────────────────────────────────────────────────────────────────
    // PO: ĐƠN ĐẶT HÀNG
    // ─────────────────────────────────────────────────────────────────────────

    @PostMapping("/purchase-orders")
    @ResponseStatus(HttpStatus.CREATED)
    public StockDocumentResponse createPurchaseOrder(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable UUID warehouseId,
            @Valid @RequestBody CreatePurchaseOrderRequest request) {
        UserIdentity user = access.authorizeRoles(authorization, warehouseId, "WAREHOUSE_MANAGER", "COMPANY_ADMIN");
        return inboundService.createPurchaseOrder(warehouseId, request, user);
    }

    @PutMapping("/purchase-orders/{poId}")
    public StockDocumentResponse updatePurchaseOrder(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable UUID warehouseId,
            @PathVariable UUID poId,
            @Valid @RequestBody CreatePurchaseOrderRequest request) {
        UserIdentity user = access.authorizeRoles(authorization, warehouseId, "WAREHOUSE_MANAGER", "COMPANY_ADMIN");
        return inboundService.updatePurchaseOrder(warehouseId, poId, request, user);
    }

    @PostMapping("/purchase-orders/{poId}/submit")
    public StockDocumentResponse submitPurchaseOrder(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable UUID warehouseId,
            @PathVariable UUID poId) {
        UserIdentity user = access.authorizeRoles(authorization, warehouseId, "WAREHOUSE_MANAGER", "COMPANY_ADMIN");
        return inboundService.submitPurchaseOrder(warehouseId, poId, user);
    }

    /**
     * Phê duyệt PO:
     * Nếu chi tiêu lớn (>= threshold): bắt buộc qua trung tâm phê duyệt công ty (COMPANY_ADMIN) - mục 2.8
     */
    @PostMapping("/purchase-orders/{poId}/approve")
    public StockDocumentResponse approvePurchaseOrder(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable UUID warehouseId,
            @PathVariable UUID poId,
            @RequestBody(required = false) ApprovalDecisionRequest request) {
        UserIdentity user = access.authorizeRoles(authorization, warehouseId, "COMPANY_ADMIN", "SYSTEM_ADMIN");
        String note = request != null ? request.note() : null;
        return inboundService.approvePurchaseOrder(warehouseId, poId, note, user);
    }

    @PostMapping("/purchase-orders/{poId}/reject")
    public StockDocumentResponse rejectPurchaseOrder(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable UUID warehouseId,
            @PathVariable UUID poId,
            @RequestBody(required = false) ApprovalDecisionRequest request) {
        UserIdentity user = access.authorizeRoles(authorization, warehouseId, "COMPANY_ADMIN", "SYSTEM_ADMIN");
        String reason = request != null ? request.note() : null;
        return inboundService.rejectPurchaseOrder(warehouseId, poId, reason, user);
    }

    @PostMapping("/purchase-orders/{poId}/cancel")
    public StockDocumentResponse cancelPurchaseOrder(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable UUID warehouseId,
            @PathVariable UUID poId,
            @RequestParam(required = false) String reason) {
        UserIdentity user = access.authorizeRoles(authorization, warehouseId, "WAREHOUSE_MANAGER", "COMPANY_ADMIN");
        return inboundService.cancelPurchaseOrder(warehouseId, poId, reason, user);
    }

    @GetMapping("/purchase-orders")
    public Page<StockDocumentResponse> listPurchaseOrders(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable UUID warehouseId,
            @RequestParam(required = false) StockDocumentStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        access.authorizeRoles(authorization, warehouseId, "WAREHOUSE_MANAGER", "COMPANY_ADMIN", "SYSTEM_ADMIN");
        return inboundService.listPurchaseOrders(warehouseId, status, pageable);
    }

    @GetMapping("/purchase-orders/{poId}")
    public StockDocumentResponse getPurchaseOrder(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable UUID warehouseId,
            @PathVariable UUID poId) {
        access.authorizeRoles(authorization, warehouseId, "WAREHOUSE_MANAGER", "COMPANY_ADMIN", "SYSTEM_ADMIN");
        return inboundService.getPurchaseOrder(warehouseId, poId);
    }

    @GetMapping("/purchase-orders/{poId}/receipts")
    public List<StockDocumentResponse> getReceiptsByPo(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable UUID warehouseId,
            @PathVariable UUID poId) {
        access.authorizeRoles(authorization, warehouseId, "WAREHOUSE_MANAGER", "COMPANY_ADMIN", "SYSTEM_ADMIN");
        return inboundService.getReceiptsByPo(warehouseId, poId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // NHẬN HÀNG (RECEIPT) ĐỐI CHIẾU VỚI PO
    // ─────────────────────────────────────────────────────────────────────────

    @PostMapping("/receipts")
    @ResponseStatus(HttpStatus.CREATED)
    public StockDocumentResponse createReceipt(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable UUID warehouseId,
            @Valid @RequestBody CreateReceiptRequest request) {
        UserIdentity user = access.authorizeRoles(authorization, warehouseId, "WAREHOUSE_MANAGER", "COMPANY_ADMIN");
        return inboundService.createReceipt(warehouseId, request, user);
    }

    @GetMapping("/receipts")
    public Page<StockDocumentResponse> listReceipts(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable UUID warehouseId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        access.authorizeRoles(authorization, warehouseId, "WAREHOUSE_MANAGER", "COMPANY_ADMIN", "SYSTEM_ADMIN");
        return inboundService.listReceipts(warehouseId, pageable);
    }

    @GetMapping("/receipts/{receiptId}")
    public StockDocumentResponse getReceipt(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable UUID warehouseId,
            @PathVariable UUID receiptId) {
        access.authorizeRoles(authorization, warehouseId, "WAREHOUSE_MANAGER", "COMPANY_ADMIN", "SYSTEM_ADMIN");
        return inboundService.getReceipt(warehouseId, receiptId);
    }
}

