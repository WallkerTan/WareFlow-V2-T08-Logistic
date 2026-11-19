package com.example.finance_service.entity;

import com.example.finance_service.dto.WarehouseChargeRequest;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** The primary key deduplicates retries in the same transaction as the ledger entries. */
@Entity @Table(name = "warehouse_charges")
@Getter @NoArgsConstructor
public class WarehouseCharge {
    @Id private UUID id;
    @Column(nullable = false) private UUID companyId;
    @Column(nullable = false) private UUID warehouseId;
    @Column(nullable = false, precision = 18, scale = 2) private BigDecimal amount;
    @Column(nullable = false) private String transactionType;
    @Column(nullable = false) private Instant occurredAt;
    public WarehouseCharge(WarehouseChargeRequest request) {
        id = request.eventId(); companyId = request.companyId(); warehouseId = request.warehouseId();
        amount = request.amount(); transactionType = request.transactionType(); occurredAt = request.occurredAt();
    }
}
