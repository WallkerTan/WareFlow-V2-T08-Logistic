package com.example.core_service.dto.request;

import com.example.core_service.entity.enums.CompanyStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateCompanyStatusRequest {

    @NotNull(message = "Trạng thái công ty không được để trống")
    private CompanyStatus status;

    private String reason;
}

