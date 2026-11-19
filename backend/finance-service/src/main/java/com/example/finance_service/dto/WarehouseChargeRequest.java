package com.example.finance_service.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record WarehouseChargeRequest(
        @NotNull UUID eventId, @NotNull UUID companyId, @NotNull UUID warehouseId,
        @NotNull @DecimalMin("0.01") @Digits(integer = 13, fraction = 2) BigDecimal amount,
        @NotNull @Pattern(regexp = "BUY|RENT") String transactionType,
        @NotNull @PastOrPresent Instant occurredAt) { }
