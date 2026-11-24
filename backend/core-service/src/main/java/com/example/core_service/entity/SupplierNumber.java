package com.example.core_service.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity @Table(name = "supplier_numbers") @Getter @Setter @NoArgsConstructor
public class SupplierNumber {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true)
    private UUID supplierId;
    private long productSequence;
}
