package com.example.inventory_service.controller;

import com.example.inventory_service.dto.*;
import com.example.inventory_service.entity.enums.*;
import com.example.inventory_service.security.WarehouseAccessService;
import com.example.inventory_service.service.StocktakeAdjustmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/warehouses/{warehouseId}/stocktakes")
@RequiredArgsConstructor
public class StocktakeController {
    private final StocktakeAdjustmentService service;
    private final WarehouseAccessService access;

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public StockDocumentResponse create(@RequestHeader(value="Authorization", required=false) String auth,
            @PathVariable UUID warehouseId, @Valid @RequestBody CreateStocktakeRequest request) {
        var user = access.authorizeRoles(auth, warehouseId, "WAREHOUSE_MANAGER", "COMPANY_ADMIN");
        return service.createStocktake(warehouseId, request, user);
    }
    @GetMapping public Page<StockDocumentResponse> list(@RequestHeader(value="Authorization", required=false) String auth,
            @PathVariable UUID warehouseId, @RequestParam(required=false) StockDocumentStatus status,
            @PageableDefault(size=20, sort="createdAt", direction=Sort.Direction.DESC) Pageable pageable) {
        access.authorizeRoles(auth, warehouseId, "WAREHOUSE_MANAGER", "COMPANY_ADMIN", "SYSTEM_ADMIN");
        return service.list(warehouseId, StockDocumentType.STOCKTAKE, status, pageable);
    }
    @GetMapping("/{id}") public StockDocumentResponse get(@RequestHeader(value="Authorization", required=false) String auth,
            @PathVariable UUID warehouseId, @PathVariable UUID id) {
        access.authorizeRoles(auth, warehouseId, "WAREHOUSE_MANAGER", "COMPANY_ADMIN", "SYSTEM_ADMIN");
        return service.get(warehouseId, id, StockDocumentType.STOCKTAKE);
    }
    @PostMapping("/{id}/{action:submit|approve|reject|cancel|complete}")
    public StockDocumentResponse transition(@RequestHeader(value="Authorization", required=false) String auth,
            @PathVariable UUID warehouseId, @PathVariable UUID id, @PathVariable String action,
            @RequestBody(required=false) ApprovalDecisionRequest request) {
        var user = (action.equals("approve") || action.equals("reject"))
                ? access.authorizeRoles(auth, warehouseId, "COMPANY_ADMIN", "SYSTEM_ADMIN")
                : access.authorizeRoles(auth, warehouseId, "WAREHOUSE_MANAGER", "COMPANY_ADMIN");
        return service.transition(warehouseId, id, StockDocumentType.STOCKTAKE, action, request == null ? null : request.note(), user);
    }
}
