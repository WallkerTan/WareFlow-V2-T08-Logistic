package com.example.inventory_service.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record PurchaseOrderLineRequest(
        @NotNull(message = "Mã sản phẩm không được để trống")
        UUID productId,

        @NotNull(message = "Số lượng đặt không được để trống")
        @DecimalMin(value = "0.01", message = "Số lượng đặt phải lớn hơn 0")
        BigDecimal qty,

        @NotNull(message = "Đơn giá không được để trống")
        @DecimalMin(value = "0.00", message = "Đơn giá không được âm")
        BigDecimal price,

        String note
) { }

