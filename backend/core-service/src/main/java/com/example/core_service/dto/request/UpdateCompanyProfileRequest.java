package com.example.core_service.dto.request;

import com.example.core_service.entity.enums.CompanyBusinessModel;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateCompanyProfileRequest {

    @NotBlank(message = "Tên công ty không được để trống")
    private String name;

    private CompanyBusinessModel businessModel;
    private String phone;
    private String address;
    private String taxCode;
    private String logo;
    private String description;
}

