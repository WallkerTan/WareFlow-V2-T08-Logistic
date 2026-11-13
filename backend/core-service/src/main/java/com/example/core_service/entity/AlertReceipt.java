package com.example.core_service.entity;
import jakarta.persistence.*;
import lombok.*;
@Entity @Table(name="alert_receipts") @Getter @Setter @NoArgsConstructor
public class AlertReceipt {
    @Id @Column(length=255) private String id;
}
