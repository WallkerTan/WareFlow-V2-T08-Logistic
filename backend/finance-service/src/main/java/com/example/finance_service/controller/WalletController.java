package com.example.finance_service.controller;

import com.example.finance_service.entity.enums.*;
import com.example.finance_service.security.FinanceAccessService;
import com.example.finance_service.service.WalletLedger;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.*;

@RestController @RequestMapping("/wallets") @RequiredArgsConstructor
public class WalletController {
    private final WalletLedger ledger;
    private final FinanceAccessService access;
    public record Funding(@NotNull UUID requestId,UUID companyId,UUID warehouseId,
                          @NotNull @Positive @Digits(integer=16,fraction=2) BigDecimal amount) {}
    @GetMapping public Map<String,BigDecimal> balance(@RequestHeader("Authorization") String auth,
            @RequestParam(required=false) UUID companyId,@RequestParam(required=false) UUID warehouseId) {
        var actor=access.authenticate(auth,"SYSTEM_ADMIN","COMPANY_ADMIN","WAREHOUSE_MANAGER");
        if(actor.role().equals("SYSTEM_ADMIN") && companyId==null && warehouseId==null)
            return Map.of("balance",ledger.balance(WalletLedger.PLATFORM));
        UUID company=access.company(actor,companyId);
        access.warehouse(actor,warehouseId,company);
        return Map.of("balance",ledger.balance(WalletLedger.account(company,warehouseId)));
    }
    @PostMapping("/opening") public void opening(@RequestHeader("Authorization") String auth,@Valid @RequestBody Funding r) {
        var actor=access.authenticate(auth,"SYSTEM_ADMIN");
        UUID company=access.company(actor,r.companyId());
        access.verifyWalletOwner(actor,company,r.warehouseId());
        ledger.post("OPENING",company,r.warehouseId(),actor.id(),r.requestId(),false,r.amount(),TransactionType.INCOME,TransactionCategory.OTHER,"Số dư đầu kỳ");
    }
    @PostMapping("/top-up")
    public void topUp(@RequestHeader("Authorization") String auth, @Valid @RequestBody Funding request) {
        var actor = access.authenticate(auth, "SYSTEM_ADMIN");
        UUID company = access.company(actor, request.companyId());
        access.verifyWalletOwner(actor, company, request.warehouseId());
        ledger.post("TOP_UP", company, request.warehouseId(), actor.id(), request.requestId(), false,
                request.amount(), TransactionType.INCOME, TransactionCategory.OTHER, "Nạp tiền vào ví");
    }
    @PostMapping("/allocate") public void allocate(@RequestHeader("Authorization") String auth,@Valid @RequestBody Funding r) {
        var actor=access.authenticate(auth,"COMPANY_ADMIN");
        var company=access.company(actor,r.companyId());
        if(r.warehouseId()==null) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,"Chọn kho nhận ngân sách");
        access.warehouse(actor,r.warehouseId(),company);
        ledger.post("ALLOCATION",company,r.warehouseId(),actor.id(),r.requestId(),true,r.amount(),TransactionType.EXPENSE,TransactionCategory.TRANSFER,"Cấp ngân sách");
    }
}
