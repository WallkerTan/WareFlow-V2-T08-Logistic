package com.example.inventory_service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CreateStocktakeRequest(@NotEmpty @Size(max = 500) List<@NotNull @Valid Line> lines,
                                    @Size(max = 2000) String note) {
    public record Line(@NotNull UUID productId, UUID lotId,
                       @NotNull @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal countedQuantity) { }
}
