package com.example.core_service.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class RegistrationEmailCode {
    @Id
    private String email;
    private String codeHash;
    private Instant expiresAt;
    private int attempts;

    public RegistrationEmailCode(String email) {
        this.email = email;
    }
}
