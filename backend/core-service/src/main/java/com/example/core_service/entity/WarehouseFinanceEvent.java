package com.example.core_service.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "warehouse_finance_events")
@Getter @Setter @NoArgsConstructor
public class WarehouseFinanceEvent {
    @Id private UUID id;
    @Column(nullable = false) private UUID companyId;
    @Column(nullable = false) private UUID warehouseId;
    @Column(nullable = false, precision = 18, scale = 2) private BigDecimal amount;
    @Column(nullable = false) private String transactionType;
    @Column(nullable = false) private Instant occurredAt;
    private Instant deliveredAt;
    private Instant retryAt;
    private int attempts;

    public static WarehouseFinanceEvent from(WarehouseTransaction transaction) {
        var event = new WarehouseFinanceEvent();
        event.id = transaction.getId(); event.companyId = transaction.getCompany().getId();
        event.warehouseId = transaction.getWarehouse().getId(); event.transactionType = transaction.getType().name();
        event.amount = transaction.getOfferedPrice() != null ? transaction.getOfferedPrice() : transaction.getWarehouse().getPrice();
        // Old transactions have no completion timestamp; retain their original historical date.
        event.occurredAt = transaction.getCompletedAt() != null ? transaction.getCompletedAt() : transaction.getCreatedAt();
        return event;
    }
}
