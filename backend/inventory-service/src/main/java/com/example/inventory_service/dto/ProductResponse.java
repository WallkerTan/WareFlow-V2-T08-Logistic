package com.example.inventory_service.dto;

import com.example.inventory_service.entity.Product;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ProductResponse(UUID id, UUID warehouseId, String sku, String barcode, String name,
                              String unit, List<String> images, BigDecimal minStock,
                              BigDecimal quantity, BigDecimal available, boolean belowMinStock,
                              Instant createdAt) {
    public static ProductResponse from(Product p, BigDecimal quantity, BigDecimal available) {
        BigDecimal onHand = quantity == null ? BigDecimal.ZERO : quantity;
        BigDecimal usable = available == null ? BigDecimal.ZERO : available;
        return new ProductResponse(p.getId(), p.getWarehouseId(), p.getSku(), p.getBarcode(), p.getName(),
                p.getUnit(), p.getImages(), p.getMinStock(), onHand, usable,
                p.getMinStock() != null && usable.compareTo(p.getMinStock()) < 0, p.getCreatedAt());
    }
}
