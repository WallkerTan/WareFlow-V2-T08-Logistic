package com.example.core_service.repository;

import com.example.core_service.entity.Company;
import com.example.core_service.entity.enums.CompanyStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface CompanyRepository extends JpaRepository<Company, UUID> {

    boolean existsByNameIgnoreCase(String name);

    Optional<Company> findByIdAndStatus(UUID id, CompanyStatus status);

    /**
     * Mã số thuế nằm trong {@code companies.profile} (jsonb) -> dùng native query.
     */
    @Query(value = "select exists(select 1 from companies c where lower(c.profile ->> 'taxCode') = lower(:taxCode))",
            nativeQuery = true)
    boolean existsByTaxCodeIgnoreCase(@Param("taxCode") String taxCode);
}
