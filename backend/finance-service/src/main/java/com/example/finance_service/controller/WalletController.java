package com.example.finance_service.controller;
import com.example.finance_service.service.WalletService;
import com.example.finance_service.security.FinanceAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.*;
@RestController @RequiredArgsConstructor
public class WalletController {
    private final WalletService wallets;
    private final FinanceAccessService access;
    @GetMapping("/wallet")
    public Map<String,Object> balance(@RequestHeader("Authorization") String auth,@RequestParam(required=false) UUID companyId,@RequestParam(required=false) UUID warehouseId) {
        var user=access.authenticate(auth,"COMPANY_ADMIN","WAREHOUSE_MANAGER","SYSTEM_ADMIN");
        access.verifyActive(user);
        var company=access.company(user,companyId); access.warehouse(user,warehouseId,company);
        return wallets.balance(company,warehouseId);
    }
    @GetMapping("/wallet/platform")
    public Map<String,Object> platform(@RequestHeader("Authorization") String auth) { access.verifyActive(access.authenticate(auth,"SYSTEM_ADMIN")); return wallets.platform(); }
    @PostMapping("/wallet/allocate")
    public void allocate(@RequestHeader("Authorization") String auth,@RequestBody WalletService.Payment p) {
        var user=access.authenticate(auth,"COMPANY_ADMIN"); var company=access.company(user,p.companyId());
        access.verifyActive(user);
        access.warehouse(user,p.warehouseId(),company);
        wallets.settle(new WalletService.Payment(p.id(),company,p.warehouseId(),"ALLOCATION",p.amount(),p.note()));
    }
    @PostMapping("/wallet/fund")
    public void fund(@RequestHeader("Authorization") String auth,@RequestBody WalletService.Payment p) {
        access.verifyActive(access.authenticate(auth,"SYSTEM_ADMIN"));
        if(p.companyId()==null)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Chọn công ty");
        wallets.settle(new WalletService.Payment(p.id(),p.companyId(),null,"INCOME",p.amount(),p.note()));
    }
    @PostMapping("/internal/operations/settle")
    public void settle(@RequestHeader("Authorization") String auth,@RequestBody WalletService.Payment p) { access.authenticateInventoryService(auth); wallets.settle(p); }
}
