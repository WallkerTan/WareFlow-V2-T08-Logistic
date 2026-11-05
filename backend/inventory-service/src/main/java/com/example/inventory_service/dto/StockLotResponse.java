package com.example.inventory_service.dto;

import com.example.inventory_service.entity.StockLot;
import com.example.inventory_service.entity.enums.StockLotStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record StockLotResponse(UUID id, UUID productId, String lotCode, LocalDate expiryDate,
                               BigDecimal quantity, BigDecimal reserved, BigDecimal available,
                               StockLotStatus status) {
    public static StockLotResponse from(StockLot lot, StockLotStatus effectiveStatus) {
        return new StockLotResponse(lot.getId(), lot.getProduct().getId(), lot.getLotCode(), lot.getExpiryDate(),
                lot.getQuantity(), lot.getReserved(), lot.getQuantity().subtract(lot.getReserved()), effectiveStatus);
    }
}
