package com.example.finance_service.entity;
import com.example.finance_service.entity.enums.TransactionCategory;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="expense_requests") @Getter @Setter @NoArgsConstructor
public class ExpenseRequest {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    private UUID companyId;
    private UUID warehouseId;
    private UUID createdBy;
    private UUID decidedBy;
    private Instant createdAt;
    private Instant decidedAt;
    private String status;
    @Enumerated(EnumType.STRING) private TransactionCategory category;
    @Column(precision=18,scale=2) private BigDecimal amount;
    @Column(length=4000) private String note;
    @Column(length=2000) private String decisionNote;
    private Long transactionId;
    @Version private Long version;
}
