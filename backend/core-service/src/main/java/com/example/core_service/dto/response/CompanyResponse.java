package com.example.core_service.dto.response;

import com.example.core_service.entity.Company;
import com.example.core_service.entity.enums.CompanyBusinessModel;
import com.example.core_service.entity.enums.CompanyStatus;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record CompanyResponse(
        UUID id,
        String name,
        CompanyBusinessModel businessModel,
        CompanyStatus status,
        Map<String, Object> profile,
        Instant createdAt
) {
    public static CompanyResponse fromEntity(Company company) {
        return new CompanyResponse(
                company.getId(),
                company.getName(),
                company.getBusinessModel(),
                company.getStatus(),
                company.getProfile(),
                company.getCreatedAt()
        );
    }
}

