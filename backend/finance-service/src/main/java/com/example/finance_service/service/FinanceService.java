package com.example.finance_service.service;

import com.example.finance_service.dto.*;
import com.example.finance_service.entity.*;
import com.example.finance_service.entity.enums.*;
import com.example.finance_service.repository.*;
import com.example.finance_service.security.FinanceAccessService;
import com.example.finance_service.security.FinanceAccessService.Identity;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.*;
import java.time.*;
import java.util.*;

@Service @RequiredArgsConstructor @Transactional
public class FinanceService {
    private final BudgetRepository budgets;
    private final TransactionRepository transactions;
    private final FinanceAccessService access;
    private final FinancePeriods periods;
    private final FinanceReportRepository reports;
    private final WalletService wallets;

    public BudgetResponse createBudget(UUID companyId, BudgetRequest request) {
        wallets.serialize(companyId);
        period(request.period());
        if (budgets.existsByCompanyIdAndWarehouseIdAndPeriod(companyId, request.warehouseId(), request.period())) conflict("Budget already exists for this scope and period");
        if(request.warehouseId()!=null) {
            currentAllocationPeriod(request.period());
            wallets.settle(new WalletService.Payment(UUID.randomUUID(),companyId,request.warehouseId(),"ALLOCATION",request.allocated(),"Cấp ngân sách "+request.period()));
            return budgetResponse(budgets.findByCompanyIdAndWarehouseIdAndPeriod(companyId,request.warehouseId(),request.period()).orElseThrow());
        }
        Budget b = budgets.save(Budget.builder().companyId(companyId).warehouseId(request.warehouseId()).allocated(request.allocated()).period(request.period()).build());
        return budgetResponse(b);
    }
    public BudgetResponse updateBudget(UUID companyId, UUID id, BudgetRequest request) {
        wallets.serialize(companyId);
        period(request.period());
        Budget b = budgets.findByIdAndCompanyId(id, companyId).orElseThrow(() -> notFound("Budget not found"));
        if(b.getWarehouseId()!=null) {
            currentAllocationPeriod(request.period());
            if(!Objects.equals(b.getWarehouseId(),request.warehouseId())||!b.getPeriod().equals(request.period()))bad("Không thay đổi kho hoặc kỳ của ngân sách đã cấp");
            BigDecimal additional=request.allocated().subtract(b.getAllocated());
            if(additional.signum()<0)bad("Không thể giảm ngân sách đã chuyển vào tài khoản kho");
            if(additional.signum()>0)wallets.settle(new WalletService.Payment(UUID.randomUUID(),companyId,b.getWarehouseId(),"ALLOCATION",additional,"Bổ sung ngân sách"));
            return budgetResponse(b);
        }
        if (budgets.existsByCompanyIdAndWarehouseIdAndPeriodAndIdNot(companyId, request.warehouseId(), request.period(), id)) conflict("Budget already exists for this scope and period");
        b.setAllocated(request.allocated()); b.setWarehouseId(request.warehouseId()); b.setPeriod(request.period());
        return budgetResponse(budgets.save(b));
    }
    @Transactional(readOnly=true)
    public List<BudgetResponse> budgets(UUID companyId, String period) {
        if (period != null) period(period);
        return (period == null ? budgets.findAllByCompanyId(companyId) : budgets.findByCompanyIdAndPeriod(companyId, period))
                .stream().map(this::budgetResponse).toList();
    }
    public TransactionResponse createTransaction(UUID companyId, TransactionRequest request, Identity user) {
        if (request.type() == TransactionType.SYSTEM_FEE) bad("SYSTEM_FEE is generated automatically");
        access.warehouse(user, request.warehouseId(), companyId);
        access.verifyActive(user);
        UUID reference=request.refDocumentId()==null?UUID.randomUUID():request.refDocumentId();
        String kind=request.type()==TransactionType.INCOME?"INCOME":"EXPENSE";
        wallets.settle(new WalletService.Payment(reference,companyId,request.warehouseId(),kind,request.amount(),request.note()));
        var tx=transactions.findFirstByCompanyIdAndRefDocumentIdAndType(companyId,reference,request.type()).orElseThrow();
        tx.setCategory(request.category());
        return TransactionResponse.from(tx);
    }
    @Transactional(readOnly=true)
    public Page<TransactionResponse> transactions(UUID companyId, UUID warehouseId, TransactionType type, String period, Pageable pageable, Identity user) {
        access.warehouse(user, warehouseId, companyId);
        Instant[] range = period(period);
        Page<Transaction> page;
        if (warehouseId != null) page = type == null
                ? transactions.findByCompanyIdAndWarehouseIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(companyId, warehouseId, range[0], range[1], pageable)
                : transactions.findByCompanyIdAndWarehouseIdAndTypeAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(companyId, warehouseId, type, range[0], range[1], pageable);
        else page = type == null
                ? transactions.findByCompanyIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(companyId, range[0], range[1], pageable)
                : transactions.findByCompanyIdAndTypeAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(companyId, type, range[0], range[1], pageable);
        return page.map(TransactionResponse::from);
    }
    @Transactional(readOnly=true)
    public FinanceSummary summary(UUID companyId, UUID warehouseId, String period, Identity user) {
        access.warehouse(user, warehouseId, companyId);
        return reports.summary(companyId, warehouseId, periods.parse(period));
    }
    private BudgetResponse budgetResponse(Budget budget) {
        var totals = reports.summary(budget.getCompanyId(), budget.getWarehouseId(), periods.parse(budget.getPeriod()));
        BigDecimal spent = totals.expense().add(totals.systemFee());
        return BudgetResponse.from(budget, spent);
    }
    private Instant[] period(String value) {
        var range = periods.parse(value);
        return new Instant[]{range.from(), range.to()};
    }
    private void bad(String message) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
    private void currentAllocationPeriod(String period) { if(!YearMonth.now(ZoneId.of("Asia/Ho_Chi_Minh")).toString().equals(period))bad("Chỉ cấp tiền vào kỳ ngân sách hiện tại"); }
    private void conflict(String message) { throw new ResponseStatusException(HttpStatus.CONFLICT, message); }
    private ResponseStatusException notFound(String message) { return new ResponseStatusException(HttpStatus.NOT_FOUND, message); }
}
