package com.example.core_service.dto.response;

import com.example.core_service.entity.Warehouse;
import com.example.core_service.entity.enums.WarehouseStatus;
import com.example.core_service.entity.enums.WarehouseType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record WarehouseResponse(
        UUID id,
        UUID ownerCompanyId,
        String ownerCompanyName,
        String name,
        WarehouseType warehouseType,
        BigDecimal area,
        BigDecimal price,
        String region,
        String address,
        WarehouseStatus status,
        Map<String, Object> handover,
        Instant createdAt
) {
    public static WarehouseResponse fromEntity(Warehouse w) {
        return new WarehouseResponse(
                w.getId(),
                w.getOwnerCompany() != null ? w.getOwnerCompany().getId() : null,
                w.getOwnerCompany() != null ? w.getOwnerCompany().getName() : null,
                w.getName(),
                w.getWarehouseType(),
                w.getArea(),
                w.getPrice(),
                w.getRegion(),
                w.getAddress(),
                w.getStatus(),
                w.getHandover(),
                w.getCreatedAt()
        );
    }
}

