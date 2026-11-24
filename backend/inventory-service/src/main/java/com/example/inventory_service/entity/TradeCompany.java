package com.example.inventory_service.entity;
import jakarta.persistence.*;
import java.util.UUID;
@Entity @Table(name="trade_companies")
public class TradeCompany {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="company_id",nullable=false,unique=true) private UUID companyId;
    @Column(name="batch_sequence",nullable=false) private long batchSequence;
}
