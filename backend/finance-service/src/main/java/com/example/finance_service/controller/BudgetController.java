package com.example.finance_service.controller;

import com.example.finance_service.dto.*;
import com.example.finance_service.security.FinanceAccessService;
import com.example.finance_service.service.FinanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/budgets") @RequiredArgsConstructor
public class BudgetController {
    private final FinanceService finance;
    private final FinanceAccessService access;
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public BudgetResponse create(@RequestHeader(value="Authorization", required=false) String auth,
            @RequestParam(required=false) UUID companyId, @Valid @RequestBody BudgetRequest request) {
        var user = access.authenticate(auth, "COMPANY_ADMIN", "SYSTEM_ADMIN");
        UUID scope = access.company(user, companyId); access.warehouse(user, request.warehouseId(), scope);
        return finance.createBudget(scope, request, user);
    }
    @PutMapping("/{id}")
    public BudgetResponse update(@RequestHeader(value="Authorization", required=false) String auth,
            @PathVariable UUID id, @RequestParam(required=false) UUID companyId, @Valid @RequestBody BudgetRequest request) {
        var user = access.authenticate(auth, "COMPANY_ADMIN", "SYSTEM_ADMIN");
        UUID scope = access.company(user, companyId); access.warehouse(user, request.warehouseId(), scope);
        return finance.updateBudget(scope, id, request, user);
    }
    @GetMapping
    public List<BudgetResponse> list(@RequestHeader(value="Authorization", required=false) String auth,
            @RequestParam(required=false) UUID companyId, @RequestParam(required=false) UUID warehouseId, @RequestParam(required=false) String period) {
        var user = access.authenticate(auth, "COMPANY_ADMIN", "WAREHOUSE_MANAGER", "SYSTEM_ADMIN");
        UUID scope = access.company(user, companyId);
        access.warehouse(user, warehouseId, scope);
        return finance.budgets(scope, period).stream().filter(b -> warehouseId == null || warehouseId.equals(b.warehouseId())).toList();
    }
}
