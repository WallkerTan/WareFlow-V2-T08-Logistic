package com.example.core_service.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="finance_events") @Getter @Setter @NoArgsConstructor
public class FinanceEvent {
    @Id private UUID id;
    private UUID companyId;
    private UUID warehouseId;
    @Column(precision=15,scale=2) private BigDecimal amount;
    private Instant occurredAt;
    private Instant deliveredAt;
    private Instant retryAt;
    private int attempts;
    public static FinanceEvent of(WarehouseTransaction t){
        FinanceEvent e=new FinanceEvent();e.id=t.getId();e.companyId=t.getCompany().getId();e.warehouseId=t.getWarehouse().getId();
        e.amount=t.getOfferedPrice();e.occurredAt=t.getCompletedAt();return e;
    }
}
