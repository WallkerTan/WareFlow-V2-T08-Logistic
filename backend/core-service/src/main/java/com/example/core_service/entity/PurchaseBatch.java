package com.example.core_service.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Entity @Table(name="purchase_batches") @Getter @Setter
public class PurchaseBatch {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID companyId;
    @Column(nullable=false,unique=true) private String code;
    @Column(nullable=false) private UUID createdBy;
    @Column(unique=true) private UUID chatRequestId;
    private Instant createdAt = Instant.now();
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable=false,columnDefinition="jsonb")
    private List<Line> lines;
    @Column(precision=24,scale=2,nullable=false) private BigDecimal total;

    public record Line(UUID supplierId, String supplierName, UUID productId, String sku, String name,
                       String unit, String barcode, BigDecimal quantity, BigDecimal price, BigDecimal amount) {}
}
