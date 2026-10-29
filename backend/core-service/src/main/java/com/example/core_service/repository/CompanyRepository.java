package com.example.core_service.repository;

import com.example.core_service.entity.Company;
import com.example.core_service.entity.enums.CompanyStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CompanyRepository extends JpaRepository<Company, UUID> {

    boolean existsByNameIgnoreCase(String name);

    Optional<Company> findByIdAndStatus(UUID id, CompanyStatus status);
}
