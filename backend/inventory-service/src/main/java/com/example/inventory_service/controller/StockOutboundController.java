package com.example.inventory_service.controller;

import com.example.inventory_service.dto.*;
import com.example.inventory_service.entity.enums.*;
import com.example.inventory_service.security.WarehouseAccessService;
import com.example.inventory_service.service.StockOutboundService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/warehouses/{warehouseId}/exports")
@RequiredArgsConstructor
public class StockOutboundController {
    private final StockOutboundService outbound;
    private final WarehouseAccessService access;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StockDocumentResponse create(@RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable UUID warehouseId, @Valid @RequestBody CreateExportRequest request) {
        var user = access.authorizeRoles(authorization, warehouseId, "WAREHOUSE_MANAGER", "COMPANY_ADMIN");
        if (request.targetWarehouseId() != null) authorizeTarget(authorization, request.targetWarehouseId());
        return outbound.create(warehouseId, request, user);
    }

    @GetMapping
    public Page<StockDocumentResponse> list(@RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable UUID warehouseId, @RequestParam(required = false) StockDocumentType type,
            @RequestParam(required = false) StockDocumentStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        access.authorizeRoles(authorization, warehouseId, "WAREHOUSE_MANAGER", "COMPANY_ADMIN", "SYSTEM_ADMIN");
        return outbound.list(warehouseId, type, status, pageable);
    }

    @GetMapping("/{id}")
    public StockDocumentResponse get(@RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable UUID warehouseId, @PathVariable UUID id) {
        access.authorizeRoles(authorization, warehouseId, "WAREHOUSE_MANAGER", "COMPANY_ADMIN", "SYSTEM_ADMIN");
        return outbound.get(warehouseId, id);
    }

    @PostMapping("/{id}/{action:submit|approve|reject|cancel|complete}")
    public StockDocumentResponse transition(@RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable UUID warehouseId, @PathVariable UUID id, @PathVariable String action,
            @RequestBody(required = false) ApprovalDecisionRequest request) {
        boolean approval = action.equals("approve") || action.equals("reject");
        var user = approval
                ? access.authorizeRoles(authorization, warehouseId, "COMPANY_ADMIN", "SYSTEM_ADMIN")
                : access.authorizeRoles(authorization, warehouseId, "WAREHOUSE_MANAGER", "COMPANY_ADMIN");
        var doc = outbound.get(warehouseId, id);
        if (doc.targetWarehouseId() != null && (action.equals("approve") || action.equals("complete")))
            authorizeTarget(authorization, doc.targetWarehouseId());
        return outbound.transition(warehouseId, id, action, request == null ? null : request.note(), user);
    }

    private void authorizeTarget(String authorization, UUID targetWarehouseId) {
        access.authorizeRoles(authorization, targetWarehouseId, "WAREHOUSE_MANAGER", "COMPANY_ADMIN", "SYSTEM_ADMIN");
    }
}
