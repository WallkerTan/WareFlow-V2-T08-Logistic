package com.example.core_service.dto.request;

import com.example.core_service.entity.enums.WarehouseTransactionType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
public class CreateWarehouseTransactionRequest {

    @NotNull(message = "Kho cần giao dịch không được để trống")
    private UUID warehouseId;

    @NotNull(message = "Loại giao dịch không được để trống")
    private WarehouseTransactionType type;

    @DecimalMin(value = "0.01", message = "Giá đề nghị phải lớn hơn 0")
    private BigDecimal offeredPrice;
}
