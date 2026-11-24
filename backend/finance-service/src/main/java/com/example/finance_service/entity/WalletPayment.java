package com.example.finance_service.entity;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;
@Entity @Table(name="wallet_payments")
public class WalletPayment {
    @Id private UUID id;
    @Column(name="company_id",nullable=false) private UUID companyId;
    @Column(name="warehouse_id") private UUID warehouseId;
    @Column(nullable=false) private String kind;
    @Column(nullable=false,precision=18,scale=2) private BigDecimal amount;
}
