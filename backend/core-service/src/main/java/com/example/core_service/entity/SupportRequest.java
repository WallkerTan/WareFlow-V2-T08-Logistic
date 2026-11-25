package com.example.core_service.entity;

import jakarta.persistence.*;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Getter
public class SupportRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 120)
    private String fullName;
    @Column(nullable = false, length = 254)
    private String email;
    @Column(length = 160)
    private String companyName;
    @Column(length = 16)
    private String warehouseSize;
    @Column(nullable = false, length = 3000)
    private String message;
    @Column(nullable = false)
    private Instant createdAt;

    @Column(length = 5000)
    private String reply;
    private Instant repliedAt;

    protected SupportRequest() {}

    public SupportRequest(String fullName, String email, String companyName, String warehouseSize, String message) {
        this.fullName = fullName.strip();
        this.email = email.strip();
        this.companyName = companyName == null ? null : companyName.strip();
        this.warehouseSize = warehouseSize;
        this.message = message.strip();
        this.createdAt = Instant.now();
    }

    public void markReplied(String reply) {
        this.reply = reply;
        this.repliedAt = Instant.now();
    }
}
