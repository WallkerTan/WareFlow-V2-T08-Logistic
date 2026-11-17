package com.example.inventory_service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CreateAdjustmentRequest(@NotEmpty @Size(max = 100) List<@NotNull @Valid Line> lines,
                                     @Size(max = 2000) String note) {
    public record Line(@NotNull UUID lotId, @NotNull @Digits(integer = 10, fraction = 2) @DecimalMin(value = "0.00", inclusive = false) BigDecimal delta) { }
}
