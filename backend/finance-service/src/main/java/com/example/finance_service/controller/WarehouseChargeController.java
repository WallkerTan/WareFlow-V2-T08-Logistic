package com.example.finance_service.controller;
import com.example.finance_service.entity.*;
import com.example.finance_service.entity.enums.*;
import com.example.finance_service.repository.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.math.*;
import java.time.Instant;
import java.util.*;
@RestController @RequiredArgsConstructor
public class WarehouseChargeController {
    private final WarehouseChargeReceiptRepository receipts;
    private final TransactionRepository transactions;
    @Value("${INTERNAL_API_KEY:}") private String key;
    public record Charge(@NotNull UUID eventId,@NotNull UUID companyId,@NotNull UUID warehouseId,
                         @NotNull @DecimalMin("0") @Digits(integer=13,fraction=2) BigDecimal amount,@NotNull Instant occurredAt){}
    @PostMapping("/internal/warehouse-charges") @Transactional
    public Map<String,String> receive(@RequestHeader(value="X-Internal-Key",required=false) String supplied,@Valid @RequestBody Charge r){
        if(key.isBlank()||supplied==null||!java.security.MessageDigest.isEqual(key.getBytes(java.nio.charset.StandardCharsets.UTF_8),supplied.getBytes(java.nio.charset.StandardCharsets.UTF_8)))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Invalid service credentials");
        var existing=receipts.findById(r.eventId());
        if(existing.isPresent()){
            var e=existing.get();if(!e.getCompanyId().equals(r.companyId())||!e.getWarehouseId().equals(r.warehouseId())||e.getAmount().compareTo(r.amount())!=0)throw new ResponseStatusException(HttpStatus.CONFLICT,"Event payload differs");
            return Map.of("status","already_applied");
        }
        var receipt=new WarehouseChargeReceipt();receipt.setId(r.eventId());receipt.setCompanyId(r.companyId());receipt.setWarehouseId(r.warehouseId());receipt.setAmount(r.amount());receipts.saveAndFlush(receipt);
        if(r.amount().signum()>0){
            transactions.save(Transaction.builder().companyId(r.companyId()).warehouseId(r.warehouseId()).type(TransactionType.EXPENSE).category(TransactionCategory.PURCHASE).amount(r.amount()).refDocumentId(r.eventId()).note("Warehouse purchase/rent").createdAt(r.occurredAt()).build());
            BigDecimal fee=r.amount().multiply(new BigDecimal("0.05")).setScale(2,RoundingMode.HALF_UP);
            if(fee.signum()>0)transactions.save(Transaction.builder().companyId(r.companyId()).warehouseId(r.warehouseId()).type(TransactionType.SYSTEM_FEE).category(TransactionCategory.FEE).amount(fee).refDocumentId(r.eventId()).note("5% warehouse transaction fee").createdAt(r.occurredAt()).build());
        }
        return Map.of("status","applied");
    }
}
