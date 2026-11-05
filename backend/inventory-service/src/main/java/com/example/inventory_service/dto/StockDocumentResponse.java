package com.example.inventory_service.dto;

import com.example.inventory_service.entity.StockDocument;
import com.example.inventory_service.entity.enums.StockDocumentStatus;
import com.example.inventory_service.entity.enums.StockDocumentType;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record StockDocumentResponse(
        UUID id,
        UUID warehouseId,
        UUID targetWarehouseId,
        StockDocumentType type,
        StockDocumentStatus status,
        List<Map<String, Object>> lines,
        Map<String, Object> approval,
        UUID createdBy,
        Instant createdAt) {
    public static StockDocumentResponse from(StockDocument doc) {
        if (doc == null)
            return null;
        return new StockDocumentResponse(
                doc.getId(),
                doc.getWarehouseId(),
                doc.getTargetWarehouseId(),
                doc.getType(),
                doc.getStatus(),
                doc.getLines(),
                doc.getApproval(),
                doc.getCreatedBy(),
                doc.getCreatedAt());
    }
}
