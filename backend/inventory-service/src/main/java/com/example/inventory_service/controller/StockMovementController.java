package com.example.inventory_service.controller;

import com.example.inventory_service.dto.StockMovementResponse;
import com.example.inventory_service.repository.StockMovementRepository;
import com.example.inventory_service.security.WarehouseAccessService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class StockMovementController {
    private final StockMovementRepository movements;
    private final WarehouseAccessService access;

    @GetMapping("/warehouses/{warehouseId}/movements")
    public Page<StockMovementResponse> listMovements(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable UUID warehouseId,
            @PageableDefault(size = 20, sort = {"createdAt", "id"}, direction = Sort.Direction.DESC) Pageable pageable) {
        access.authorize(authorization, warehouseId, false);
        return movements.findHistory(warehouseId, pageable);
    }
}
