package com.example.inventory_service.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record StockMovementResponse(Long id, String sku, String lotCode, String documentType,
                                    BigDecimal qtyChange, Instant createdAt, String note) {
}
