package com.example.core_service.dto.request;

import com.example.core_service.entity.enums.CompanyBusinessModel;
import jakarta.validation.constraints.*;

public record SupplierRequest(
        @NotBlank @Size(max = 255) String name,
        @NotNull CompanyBusinessModel businessModel,
        @Size(max = 100) String contactPerson,
        @Size(max = 50) String phone,
        @Email @Size(max = 255) String email,
        @Size(max = 1000) String address) { }
