package com.example.finance_service.dto;

import com.example.finance_service.entity.Transaction;
import com.example.finance_service.entity.enums.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record TransactionResponse(Long id, UUID companyId, UUID warehouseId, TransactionType type,
        TransactionCategory category, BigDecimal amount, UUID refDocumentId, String note, Instant createdAt) {
    public static TransactionResponse from(Transaction t) { return new TransactionResponse(t.getId(), t.getCompanyId(), t.getWarehouseId(), t.getType(), t.getCategory(), t.getAmount(), t.getRefDocumentId(), t.getNote(), t.getCreatedAt()); }
}
