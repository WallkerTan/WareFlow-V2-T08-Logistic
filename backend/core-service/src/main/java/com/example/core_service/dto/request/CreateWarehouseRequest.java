package com.example.core_service.dto.request;

import com.example.core_service.entity.enums.WarehouseType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.math.BigDecimal;

/**
 * Request tạo kho hệ thống mới (ownerCompany = null, status = AVAILABLE).
 * Chỉ SYSTEM_ADMIN được phép gọi endpoint này.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateWarehouseRequest {

    @NotBlank(message = "Tên kho không được để trống")
    @Size(max = 255, message = "Tên kho tối đa 255 ký tự")
    private String name;

    @NotNull(message = "Loại kho không được để trống (BUY hoặc RENT)")
    private WarehouseType warehouseType;

    @NotNull(message = "Diện tích không được để trống")
    @DecimalMin(value = "0.01", message = "Diện tích phải lớn hơn 0")
    private BigDecimal area;

    @NotNull(message = "Giá không được để trống")
    @DecimalMin(value = "0", inclusive = true, message = "Giá không được âm")
    private BigDecimal price;

    @NotBlank(message = "Khu vực/vùng không được để trống")
    @Size(max = 255, message = "Khu vực tối đa 255 ký tự")
    private String region;

    @Size(max = 1000, message = "Địa chỉ tối đa 1000 ký tự")
    private String address;
}

