package com.example.inventory_service.controller;

import com.example.inventory_service.dto.StockDocumentResponse;
import com.example.inventory_service.entity.enums.StockLotStatus;
import com.example.inventory_service.security.WarehouseAccessService;
import com.example.inventory_service.service.SalesReturnService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController @RequiredArgsConstructor
@RequestMapping("/warehouses/{warehouseId}/sales-returns")
public class SalesReturnController {
    private final WarehouseAccessService access;
    private final SalesReturnService returns;
    public record Request(@NotNull UUID shipmentId,@NotNull StockLotStatus condition,@Size(max=2000) String note) {}
    @PostMapping
    public StockDocumentResponse receive(@RequestHeader(value="Authorization",required=false) String auth,
            @PathVariable UUID warehouseId,@Valid @RequestBody Request request) {
        var user=access.authorizeRoles(auth,warehouseId,"WAREHOUSE_MANAGER","COMPANY_ADMIN");
        return returns.receive(auth,warehouseId,request.shipmentId(),request.condition(),request.note(),user);
    }
}
