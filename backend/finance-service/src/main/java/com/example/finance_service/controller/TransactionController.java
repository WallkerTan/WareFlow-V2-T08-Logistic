package com.example.finance_service.controller;

import com.example.finance_service.dto.*;
import com.example.finance_service.entity.enums.TransactionType;
import com.example.finance_service.security.FinanceAccessService;
import com.example.finance_service.service.FinanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController @RequestMapping("/transactions") @RequiredArgsConstructor
public class TransactionController {
    private final FinanceService finance;
    private final FinanceAccessService access;
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public TransactionResponse create(@RequestHeader(value="Authorization", required=false) String auth,
            @RequestParam(required=false) UUID companyId, @Valid @RequestBody TransactionRequest request) {
        var user = access.authenticate(auth, "COMPANY_ADMIN", "WAREHOUSE_MANAGER", "SYSTEM_ADMIN");
        UUID scope = access.company(user, companyId);
        if ("WAREHOUSE_MANAGER".equals(user.role()) && request.warehouseId() == null) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "warehouseId is required");
        return finance.createTransaction(scope, request, user);
    }
    @GetMapping
    public Page<TransactionResponse> list(@RequestHeader(value="Authorization", required=false) String auth,
            @RequestParam(required=false) UUID companyId, @RequestParam(required=false) UUID warehouseId,
            @RequestParam(required=false) TransactionType type, @RequestParam String period,
            @PageableDefault(size=20, sort="createdAt", direction=Sort.Direction.DESC) Pageable pageable) {
        var user = access.authenticate(auth, "COMPANY_ADMIN", "WAREHOUSE_MANAGER", "SYSTEM_ADMIN");
        UUID scope = access.company(user, companyId);
        if ("WAREHOUSE_MANAGER".equals(user.role()) && warehouseId == null) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "warehouseId is required");
        return finance.transactions(scope, warehouseId, type, period, pageable, user);
    }
}
