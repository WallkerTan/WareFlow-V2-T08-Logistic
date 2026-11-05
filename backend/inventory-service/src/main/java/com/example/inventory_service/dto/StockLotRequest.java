package com.example.inventory_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** Lot quantity is populated by the receiving document/movement workflow, never edited here. */
public record StockLotRequest(
        @NotBlank @Size(max = 100) String lotCode,
        LocalDate expiryDate) { }
