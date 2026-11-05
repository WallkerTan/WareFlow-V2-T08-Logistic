package com.example.inventory_service.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

public record ProductRequest(
        @NotBlank @Size(max = 100) String sku,
        @Size(max = 100) String barcode,
        @NotBlank @Size(max = 255) String name,
        @Size(max = 100) String unit,
        List<@Size(max = 2048) String> images,
        @DecimalMin(value = "0.0", inclusive = true) BigDecimal minStock) { }
