package com.example.core_service.dto.request;

import lombok.*;

/**
 * Request trả kho: COMPANY_ADMIN khởi tạo yêu cầu trả kho về hệ thống.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReturnWarehouseRequest {

    /** Lý do trả kho (tuỳ chọn). */
    private String reason;
}

