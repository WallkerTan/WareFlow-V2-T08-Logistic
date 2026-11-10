package com.example.finance_service.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.UUID;

public record BudgetRequest(@NotNull @DecimalMin(value="0.01") @Digits(integer=16, fraction=2) BigDecimal allocated,
                            @NotBlank @Size(max=20) String period, UUID warehouseId) { }
