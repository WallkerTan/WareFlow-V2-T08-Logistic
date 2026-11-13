package com.example.finance_service.dto;

import com.example.finance_service.entity.Budget;
import java.math.BigDecimal;
import java.util.UUID;

public record BudgetResponse(UUID id, UUID companyId, UUID warehouseId, BigDecimal allocated, String period,
                             BigDecimal spent, BigDecimal remaining, BigDecimal overBudget) {
    public static BudgetResponse from(Budget b, BigDecimal spent) {
        BigDecimal remaining = b.getAllocated().subtract(spent);
        return new BudgetResponse(b.getId(), b.getCompanyId(), b.getWarehouseId(), b.getAllocated(), b.getPeriod(), spent,
                remaining.max(BigDecimal.ZERO), remaining.min(BigDecimal.ZERO).abs());
    }
}
