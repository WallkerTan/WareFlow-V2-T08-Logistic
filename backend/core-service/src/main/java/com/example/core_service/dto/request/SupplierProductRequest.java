package com.example.core_service.dto.request;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record SupplierProductRequest(
        @Size(max = 100) String sku,
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Size(max = 100) String unit,
        @NotNull @DecimalMin("0") @Digits(integer = 13, fraction = 2) BigDecimal price,
        @Size(max = 100) String barcode,
        @Size(max = 2048) String image) { }
