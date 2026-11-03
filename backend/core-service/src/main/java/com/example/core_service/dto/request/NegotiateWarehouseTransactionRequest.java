package com.example.core_service.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class NegotiateWarehouseTransactionRequest {

    @NotBlank(message = "Nội dung thương lượng không được để trống")
    @Size(max = 2000, message = "Nội dung thương lượng tối đa 2000 ký tự")
    private String message;

    @DecimalMin(value = "0.01", message = "Giá đề nghị phải lớn hơn 0")
    private BigDecimal offeredPrice;
}
