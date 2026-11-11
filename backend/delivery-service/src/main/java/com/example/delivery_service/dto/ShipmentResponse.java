package com.example.delivery_service.dto;

import com.example.delivery_service.entity.Shipment;
import com.example.delivery_service.entity.enums.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

public record ShipmentResponse(UUID id, UUID warehouseId, UUID documentId, String carrier,
    String trackingCode, ShipmentStatus status, BigDecimal codAmount, CodStatus codStatus,
    Instant collectedAt, UUID collectedBy, Instant createdAt, List<Map<String,Object>> history) {
    public static ShipmentResponse from(Shipment s) {
        return new ShipmentResponse(s.getId(), s.getWarehouseId(), s.getDocumentId(), s.getCarrier(),
            s.getTrackingCode(), s.getStatus(), s.getCodAmount(), s.getCodStatus(),
            s.getCollectedAt(), s.getCollectedBy(), s.getCreatedAt(),
            s.getHistory() == null ? List.of() : new ArrayList<>(s.getHistory()));
    }
}
