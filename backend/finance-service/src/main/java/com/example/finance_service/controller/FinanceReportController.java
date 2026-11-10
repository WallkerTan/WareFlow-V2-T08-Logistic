package com.example.finance_service.controller;

import com.example.finance_service.dto.FinanceSummary;
import com.example.finance_service.security.FinanceAccessService;
import com.example.finance_service.service.FinanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController @RequestMapping("/reports/finance") @RequiredArgsConstructor
public class FinanceReportController {
    private final FinanceService finance;
    private final FinanceAccessService access;
    @GetMapping
    public FinanceSummary summary(@RequestHeader(value="Authorization", required=false) String auth,
            @RequestParam(required=false) UUID companyId, @RequestParam(required=false) UUID warehouseId,
            @RequestParam String period) {
        var user = access.authenticate(auth, "COMPANY_ADMIN", "WAREHOUSE_MANAGER", "SYSTEM_ADMIN");
        UUID scope = access.company(user, companyId);
        if ("WAREHOUSE_MANAGER".equals(user.role()) && warehouseId == null) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "warehouseId is required");
        return finance.summary(scope, warehouseId, period, user);
    }
}
