package com.example.finance_service.dto;

import com.example.finance_service.entity.enums.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.UUID;

public record TransactionRequest(@NotNull TransactionType type, @NotNull TransactionCategory category,
                                @NotNull @DecimalMin(value="0.01") @Digits(integer=16, fraction=2) BigDecimal amount,
                                UUID warehouseId, UUID refDocumentId, @Size(max=4000) String note) { }
