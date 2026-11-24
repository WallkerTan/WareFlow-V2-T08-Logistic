package com.example.finance_service.service;

import com.example.finance_service.entity.Transaction;
import com.example.finance_service.entity.enums.*;
import com.example.finance_service.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.math.*;
import java.util.*;

/** Account balances and their journal entries commit in the same finance transaction. */
@Service @RequiredArgsConstructor
public class WalletService {
    private final JdbcTemplate jdbc;
    private final TransactionRepository transactions;
    private final com.example.finance_service.repository.BudgetRepository budgets;
    public record Payment(UUID id, UUID companyId, UUID warehouseId, String kind, BigDecimal amount, String note) {}
    public static BigDecimal fee(BigDecimal amount) { return amount.multiply(new BigDecimal("0.05")).setScale(2, RoundingMode.HALF_UP); }
    private String account(UUID company, UUID warehouse) { return warehouse == null ? "company:" + company : "warehouse:" + warehouse; }
    private void ensure(String id) { jdbc.update("insert into wallet_accounts(id,balance) values (?,0) on conflict do nothing", id); }
    private BigDecimal lock(String id) {
        ensure(id);
        return jdbc.queryForObject("select balance from wallet_accounts where id=? for update", BigDecimal.class, id);
    }
    @Transactional
    public void serialize(UUID company) { lock(account(company,null)); }
    @Transactional
    public Map<String,Object> balance(UUID company, UUID warehouse) {
        String id = account(company, warehouse); ensure(id);
        return Map.of("account",id,"balance",jdbc.queryForObject("select balance from wallet_accounts where id=?",BigDecimal.class,id));
    }
    @Transactional
    public Map<String,Object> platform() { ensure("platform"); return Map.of("balance", jdbc.queryForObject("select balance from wallet_accounts where id='platform'",BigDecimal.class)); }

    @Transactional
    public void settle(Payment p) {
        settle(p,java.time.Instant.now());
    }
    @Transactional
    public void settle(Payment p,java.time.Instant occurredAt) {
        if (p.id()==null || p.companyId()==null || p.amount()==null || p.amount().signum()<0 || p.amount().scale()>2 || p.amount().compareTo(new BigDecimal("90000000000000"))>0)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Giao dịch không hợp lệ");
        if (!Set.of("PURCHASE","SALE","RETURN","ALLOCATION","INCOME","EXPENSE").contains(p.kind()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Loại giao dịch không hợp lệ");
        if (p.kind().equals("ALLOCATION") && p.warehouseId()==null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Chọn kho nhận ngân sách");
        // A company lock serializes account creation, idempotency and transfers, including first use.
        String companyAccount = account(p.companyId(), null);
        lock(companyAccount);
        var existing = jdbc.queryForList("select company_id,warehouse_id,kind,amount from wallet_payments where id=?",p.id());
        if (!existing.isEmpty()) {
            var old=existing.getFirst();
            if (!p.companyId().equals(old.get("company_id")) || !Objects.equals(p.warehouseId(),old.get("warehouse_id"))
                    || !p.kind().equals(old.get("kind")) || p.amount().compareTo((BigDecimal)old.get("amount"))!=0)
                throw new ResponseStatusException(HttpStatus.CONFLICT,"Mã giao dịch đã dùng cho nội dung khác");
            return;
        }
        boolean income=Set.of("SALE","RETURN","INCOME").contains(p.kind());
        boolean allocation=p.kind().equals("ALLOCATION");
        UUID chargedWarehouse = allocation || Set.of("SALE","RETURN").contains(p.kind()) ? null : p.warehouseId();
        String source = account(p.companyId(),chargedWarehouse);
        BigDecimal current=lock(source), fee=fee(p.amount());
        BigDecimal change=income ? p.amount().subtract(fee) : p.amount().add(fee).negate();
        if (current.add(change).signum()<0) throw new ResponseStatusException(HttpStatus.CONFLICT,
                chargedWarehouse==null?"Tài khoản công ty không đủ số dư (gồm phí 5%)":"Kho không đủ số dư (gồm phí 5%). Công ty cần cấp thêm ngân sách cho kho.");
        jdbc.update("update wallet_accounts set balance=balance+? where id=?",change,source);
        if(allocation) {
            String target=account(p.companyId(),p.warehouseId()); lock(target); jdbc.update("update wallet_accounts set balance=balance+? where id=?",p.amount(),target);
            String period=java.time.YearMonth.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toString();
            var budget=budgets.findByCompanyIdAndWarehouseIdAndPeriod(p.companyId(),p.warehouseId(),period).orElseGet(()->
                    com.example.finance_service.entity.Budget.builder().companyId(p.companyId()).warehouseId(p.warehouseId()).period(period).allocated(BigDecimal.ZERO).build());
            budget.setAllocated(budget.getAllocated().add(p.amount()));budgets.save(budget);
        }
        lock("platform"); jdbc.update("update wallet_accounts set balance=balance+? where id='platform'",fee);
        jdbc.update("insert into wallet_payments(id,company_id,warehouse_id,kind,amount) values (?,?,?,?,?)",p.id(),p.companyId(),p.warehouseId(),p.kind(),p.amount());
        TransactionCategory category=switch(p.kind()) {case "PURCHASE" -> TransactionCategory.PURCHASE; case "SALE" -> TransactionCategory.SALE; case "ALLOCATION" -> TransactionCategory.TRANSFER; default -> TransactionCategory.OTHER;};
        UUID journalWarehouse=Set.of("SALE","RETURN").contains(p.kind())?p.warehouseId():chargedWarehouse;
        journal(p,journalWarehouse,income?TransactionType.INCOME:TransactionType.EXPENSE,category,p.amount(),occurredAt);
        if (allocation) journal(p,p.warehouseId(),TransactionType.INCOME,TransactionCategory.TRANSFER,p.amount(),occurredAt);
        if(fee.signum()>0) journal(p,journalWarehouse,TransactionType.SYSTEM_FEE,TransactionCategory.FEE,fee,occurredAt);
    }
    private void journal(Payment p,UUID warehouse,TransactionType type,TransactionCategory category,BigDecimal amount,java.time.Instant occurredAt) {
        transactions.save(Transaction.builder().companyId(p.companyId()).warehouseId(warehouse).type(type).category(category)
                .amount(amount).refDocumentId(p.id()).createdAt(occurredAt).note((type==TransactionType.SYSTEM_FEE?"Phí dịch vụ 5% · ":"")+p.kind()+" · "+Objects.toString(p.note(),"")).build());
    }
}
