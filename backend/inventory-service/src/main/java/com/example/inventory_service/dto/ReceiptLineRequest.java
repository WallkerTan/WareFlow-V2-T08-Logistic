package com.example.inventory_service.dto;

import com.example.inventory_service.entity.enums.StockLotStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record ReceiptLineRequest(
        @NotNull(message = "Mã sản phẩm không được để trống")
        UUID productId,

        @NotNull(message = "Số lượng nhận không được để trống")
        @Positive(message = "Số lượng nhận phải lớn hơn 0")
        BigDecimal receivedQty,

        @NotBlank(message = "Mã lô hàng không được để trống")
        String lotCode,

        LocalDate expiryDate,
        StockLotStatus condition
) { }

