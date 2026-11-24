package com.example.finance_service.entity;
import jakarta.persistence.*;
import java.math.BigDecimal;
@Entity @Table(name="wallet_accounts")
public class WalletAccount {
    @Id private String id;
    @Column(nullable=false,precision=18,scale=2) private BigDecimal balance;
}
