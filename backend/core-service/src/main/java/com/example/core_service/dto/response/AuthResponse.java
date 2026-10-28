package com.example.core_service.dto.response;

import com.example.core_service.entity.enums.UserRole;

import java.time.Instant;
import java.util.UUID;

/**
 * Response chung cho register / login / me.
 */
public record AuthResponse(
        String tokenType,
        String accessToken,
        Instant expiresAt,
        UUID userId,
        String email,
        String fullName,
        UserRole role,
        UUID companyId,
        String companyName
) {
}
