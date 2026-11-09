package com.example.inventory_service.dto;

import com.example.inventory_service.entity.enums.StockDocumentType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CreateExportRequest(
        @NotNull StockDocumentType type,
        UUID targetWarehouseId,
        @NotEmpty @Size(max = 100) List<@NotNull @Valid Line> lines,
        @Size(max = 2000) String note) {
    public record Line(@NotNull UUID lotId,
                       @NotNull @DecimalMin(value = "0", inclusive = false)
                       @Digits(integer = 10, fraction = 2) BigDecimal quantity,
                       UUID targetProductId) { }
}
