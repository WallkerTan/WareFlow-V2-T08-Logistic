package com.example.core_service.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.UUID;

/**
 * Request bàn giao kho: COMPANY_ADMIN chọn warehouse_manager để nhận quản lý kho.
 * Gọi sau khi SYSTEM_ADMIN đã duyệt giao dịch (status = APPROVED → COMPLETED).
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HandoverWarehouseRequest {

    @NotNull(message = "ID nhân viên quản lý kho không được để trống")
    private UUID managerId;

    /** Ghi chú bàn giao (tuỳ chọn). */
    private String note;
}

