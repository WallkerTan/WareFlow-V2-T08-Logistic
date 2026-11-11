package com.example.delivery_service.dto;

import com.example.delivery_service.entity.enums.ShipmentStatus;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.UUID;

public final class ShipmentRequests {
    private ShipmentRequests() {}
    public record Create(@NotNull UUID documentId,
        @NotBlank @Size(max=255) String carrier, @NotBlank @Size(max=255) String trackingCode,
        @DecimalMin("0") @Digits(integer=13, fraction=2) BigDecimal codAmount) {}
    public record Update(@Size(min=1, max=255) String carrier, @Size(min=1, max=255) String trackingCode,
        @DecimalMin("0") @Digits(integer=13, fraction=2) BigDecimal codAmount) {}
    public record Status(@NotNull ShipmentStatus status, @Size(max=2000) String note,
        @Size(max=255) String location) {}
}
