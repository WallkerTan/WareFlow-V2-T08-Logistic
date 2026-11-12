package com.example.core_service.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.UUID;
@Entity @Table(name="supplier_products",uniqueConstraints=@UniqueConstraint(columnNames={"supplierId","sku"}))
@Getter @Setter @NoArgsConstructor
public class SupplierProduct {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID supplierId;
    @Column(nullable=false) private String sku;
    @Column(nullable=false) private String name;
    private String unit;
    @Column(precision=15,scale=2) private BigDecimal price;
    @Column(length=2048) private String image;
    @Version private long version;
}
