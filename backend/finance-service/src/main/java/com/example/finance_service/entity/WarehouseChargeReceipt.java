package com.example.finance_service.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.UUID;
@Entity @Table(name="warehouse_charge_receipts") @Getter @Setter @NoArgsConstructor
public class WarehouseChargeReceipt {
    @Id private UUID id;
    private UUID companyId;
    private UUID warehouseId;
    @Column(precision=18,scale=2) private BigDecimal amount;
}
