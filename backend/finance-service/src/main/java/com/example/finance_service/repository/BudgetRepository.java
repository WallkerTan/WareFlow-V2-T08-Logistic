package com.example.finance_service.repository;

import com.example.finance_service.entity.Budget;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface BudgetRepository extends JpaRepository<Budget, UUID> {
    List<Budget> findByCompanyIdAndPeriod(UUID companyId, String period);
    List<Budget> findAllByCompanyId(UUID companyId);
    Optional<Budget> findByIdAndCompanyId(UUID id, UUID companyId);
    boolean existsByCompanyIdAndWarehouseIdAndPeriod(UUID companyId, UUID warehouseId, String period);
    boolean existsByCompanyIdAndWarehouseIdAndPeriodAndIdNot(UUID companyId, UUID warehouseId, String period, UUID id);
}
