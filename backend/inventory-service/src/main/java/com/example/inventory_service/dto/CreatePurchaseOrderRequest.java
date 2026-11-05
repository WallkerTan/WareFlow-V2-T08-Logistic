package com.example.inventory_service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreatePurchaseOrderRequest(
        String supplierName,
        UUID supplierId,
        LocalDate expectedDeliveryDate,
        String note,
        Boolean submitImmediately,

        @NotEmpty(message = "Danh sách mặt hàng đặt mua không được để trống")
        @Valid
        List<PurchaseOrderLineRequest> lines
) { }

