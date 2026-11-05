package com.example.inventory_service.controller;

import com.example.inventory_service.dto.ProductRequest;
import com.example.inventory_service.dto.ProductResponse;
import com.example.inventory_service.dto.StockLotRequest;
import com.example.inventory_service.dto.StockLotResponse;
import com.example.inventory_service.entity.enums.StockLotStatus;
import com.example.inventory_service.security.WarehouseAccessService;
import com.example.inventory_service.service.InventoryCatalogService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/warehouses/{warehouseId}/products")
@RequiredArgsConstructor
public class InventoryCatalogController {
    private final InventoryCatalogService catalog;
    private final WarehouseAccessService access;

    @GetMapping
    public Page<ProductResponse> listProducts(@RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable UUID warehouseId, @RequestParam(required = false) String search,
            @RequestParam(required = false) String unit, @RequestParam(required = false) Boolean belowMin,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        access.authorize(authorization, warehouseId, false);
        return catalog.listProducts(warehouseId, search, unit, belowMin, pageable);
    }

    @GetMapping("/{productId}")
    public ProductResponse getProduct(@RequestHeader(value = "Authorization", required = false) String authorization,
                                      @PathVariable UUID warehouseId, @PathVariable UUID productId) {
        access.authorize(authorization, warehouseId, false);
        return catalog.getProduct(warehouseId, productId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductResponse createProduct(@RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable UUID warehouseId, @Valid @RequestBody ProductRequest request) {
        access.authorize(authorization, warehouseId, true);
        return catalog.createProduct(warehouseId, request);
    }

    @PutMapping("/{productId}")
    public ProductResponse updateProduct(@RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable UUID warehouseId, @PathVariable UUID productId, @Valid @RequestBody ProductRequest request) {
        access.authorize(authorization, warehouseId, true);
        return catalog.updateProduct(warehouseId, productId, request);
    }

    @DeleteMapping("/{productId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteProduct(@RequestHeader(value = "Authorization", required = false) String authorization,
                              @PathVariable UUID warehouseId, @PathVariable UUID productId) {
        access.authorize(authorization, warehouseId, true);
        catalog.deleteProduct(warehouseId, productId);
    }

    @GetMapping("/{productId}/lots")
    public List<StockLotResponse> listLots(@RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable UUID warehouseId, @PathVariable UUID productId,
            @RequestParam(required = false) String status) {
        access.authorize(authorization, warehouseId, false);
        return catalog.listLots(warehouseId, productId, parseStatus(status));
    }

    @GetMapping("/{productId}/lots/{lotId}")
    public StockLotResponse getLot(@RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable UUID warehouseId, @PathVariable UUID productId, @PathVariable UUID lotId) {
        access.authorize(authorization, warehouseId, false);
        return catalog.getLot(warehouseId, productId, lotId);
    }

    @PostMapping("/{productId}/lots")
    @ResponseStatus(HttpStatus.CREATED)
    public StockLotResponse createLot(@RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable UUID warehouseId, @PathVariable UUID productId, @Valid @RequestBody StockLotRequest request) {
        access.authorize(authorization, warehouseId, true);
        return catalog.createLot(warehouseId, productId, request);
    }

    @PutMapping("/{productId}/lots/{lotId}")
    public StockLotResponse updateLot(@RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable UUID warehouseId, @PathVariable UUID productId, @PathVariable UUID lotId,
            @Valid @RequestBody StockLotRequest request) {
        access.authorize(authorization, warehouseId, true);
        return catalog.updateLotMetadata(warehouseId, productId, lotId, request);
    }

    @PatchMapping("/{productId}/lots/{lotId}/condition")
    public StockLotResponse updateLotCondition(@RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable UUID warehouseId, @PathVariable UUID productId, @PathVariable UUID lotId,
            @RequestParam String status) {
        access.authorize(authorization, warehouseId, true);
        return catalog.setLotCondition(warehouseId, productId, lotId, parseStatus(status));
    }

    @DeleteMapping("/{productId}/lots/{lotId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteLot(@RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable UUID warehouseId, @PathVariable UUID productId, @PathVariable UUID lotId) {
        access.authorize(authorization, warehouseId, true);
        catalog.deleteLot(warehouseId, productId, lotId);
    }

    private StockLotStatus parseStatus(String value) {
        if (value == null || value.isBlank()) return null;
        try { return StockLotStatus.valueOf(value.trim().toUpperCase().replace('-', '_')); }
        catch (IllegalArgumentException ex) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "Trạng thái lô không hợp lệ");
        }
    }
}
