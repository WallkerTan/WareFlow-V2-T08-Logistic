package com.example.inventory_service.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.util.*;
import java.time.Instant;
import java.math.BigDecimal;
@Entity @Table(name="trade_operations") @Getter @Setter @NoArgsConstructor
public class TradeOperation {
    @Id private UUID id;
    @Column(nullable=false) private UUID companyId;
    @Column(nullable=false) private UUID warehouseId;
    private UUID targetWarehouseId;
    private UUID createdBy;
    @Column(nullable=false) private String kind;
    @Column(nullable=false) private String status;
    private boolean warehousePayment;
    @Column(precision=18,scale=2) private BigDecimal amount;
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition="jsonb") private List<Map<String,Object>> lines;
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition="jsonb") private Map<String,Object> details=new LinkedHashMap<>();
    private Instant createdAt=Instant.now();
}
