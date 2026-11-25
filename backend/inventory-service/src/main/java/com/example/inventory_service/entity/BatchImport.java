package com.example.inventory_service.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
@Entity @Table(name="batch_imports") @Getter @Setter
public class BatchImport {
    @Id private UUID id;
    @Column(nullable=false) private UUID companyId;
    @Column(nullable=false) private UUID warehouseId;
    @Column(nullable=false) private UUID createdBy;
    private boolean warehousePayment;
    private Instant createdAt=Instant.now();
    private String status;
    @Transient private String paymentError;
    @Column(precision=18,scale=2) private BigDecimal total;
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition="jsonb") private List<Batch> batches;
    public record Batch(UUID id,String code,UUID companyId,BigDecimal total,List<Line> lines){}
    public record Line(UUID supplierId,UUID productId,String sku,String name,String unit,String barcode,
                       BigDecimal quantity,BigDecimal price,BigDecimal amount){}
}
