package com.example.inventory_service.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.util.*;
import java.time.Instant;
@Entity @Table(name="trade_batches") @Getter @Setter @NoArgsConstructor
public class TradeBatch {
    @Id private UUID id=UUID.randomUUID();
    @Column(nullable=false) private UUID companyId;
    @Column(nullable=false,unique=true) private String code;
    @Column(nullable=false) private String status="READY";
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition="jsonb") private List<Map<String,Object>> lines;
    private Instant createdAt=Instant.now();
}
