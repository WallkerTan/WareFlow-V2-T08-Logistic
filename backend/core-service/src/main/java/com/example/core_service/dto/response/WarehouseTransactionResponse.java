package com.example.core_service.dto.response;

import com.example.core_service.entity.WarehouseTransaction;
import com.example.core_service.entity.enums.WarehouseTransactionStatus;
import com.example.core_service.entity.enums.WarehouseTransactionType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record WarehouseTransactionResponse(
        UUID id,
        UUID warehouseId,
        String warehouseName,
        UUID companyId,
        String companyName,
        WarehouseTransactionType type,
        WarehouseTransactionStatus status,
        BigDecimal offeredPrice,
        Map<String, Object> negotiation,
        UUID approvedBy,
        Instant createdAt,
        BigDecimal platformFee,
        Instant completedAt
) {
    public static WarehouseTransactionResponse fromEntity(WarehouseTransaction transaction) {
        return new WarehouseTransactionResponse(
                transaction.getId(),
                transaction.getWarehouse().getId(),
                transaction.getWarehouse().getName(),
                transaction.getCompany().getId(),
                transaction.getCompany().getName(),
                transaction.getType(),
                transaction.getStatus(),
                transaction.getOfferedPrice(),
                transaction.getNegotiation(),
                transaction.getApprovedBy() != null ? transaction.getApprovedBy().getId() : null,
                transaction.getCreatedAt(),
                transaction.getPlatformFee(),
                transaction.getCompletedAt()
        );
    }
}
