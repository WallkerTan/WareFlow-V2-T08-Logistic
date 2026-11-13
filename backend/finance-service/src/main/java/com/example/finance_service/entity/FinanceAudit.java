package com.example.finance_service.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.*;
@Entity @Table(name="finance_audit") @Getter @Setter @NoArgsConstructor
public class FinanceAudit {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    private UUID companyId;
    private UUID actorId;
    private String action;
    private String targetId;
    private Instant createdAt;
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition="jsonb") private Map<String,Object> details;
}
