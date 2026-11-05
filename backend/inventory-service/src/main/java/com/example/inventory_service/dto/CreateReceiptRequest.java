package com.example.inventory_service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record CreateReceiptRequest(
        @NotNull(message = "Mã đơn đặt hàng PO không được để trống")
        UUID poId,

        String note,
        Boolean completePo,

        @NotEmpty(message = "Danh sách mặt hàng thực nhận không được để trống")
        @Valid
        List<ReceiptLineRequest> lines
) { }

