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
    private final FinanceAuditRepository audits;

    public void recordAudit(UUID companyId,UUID actor,String action,String target,Map<String,Object> details){
        FinanceAudit a=new FinanceAudit();a.setCompanyId(companyId);a.setActorId(actor);a.setAction(action);a.setTargetId(target);a.setDetails(details);a.setCreatedAt(Instant.now());audits.save(a);
    }
    public BudgetResponse createBudget(UUID companyId,BudgetRequest request,Identity actor){
        var result=createBudget(companyId,request);recordAudit(companyId,actor.id(),"CREATE_BUDGET",result.id().toString(),Map.of("allocated",request.allocated(),"period",request.period()));return result;
    }
    public BudgetResponse updateBudget(UUID companyId,UUID id,BudgetRequest request,Identity actor){
        var previous=budgets.findByIdAndCompanyId(id,companyId).orElseThrow(()->notFound("Budget not found"));
        var before=previous.getAllocated();var result=updateBudget(companyId,id,request);recordAudit(companyId,actor.id(),"UPDATE_BUDGET",id.toString(),Map.of("previousAllocated",before,"allocated",request.allocated(),"period",request.period()));return result;
    }

    public BudgetResponse createBudget(UUID companyId, BudgetRequest request) {
        period(request.period());
        if (budgets.existsByCompanyIdAndWarehouseIdAndPeriod(companyId, request.warehouseId(), request.period())) conflict("Budget already exists for this scope and period");
        Budget b = budgets.save(Budget.builder().companyId(companyId).warehouseId(request.warehouseId()).allocated(request.allocated()).period(request.period()).build());
        return budgetResponse(b);
    }
    public BudgetResponse updateBudget(UUID companyId, UUID id, BudgetRequest request) {
        period(request.period());
        Budget b = budgets.findByIdAndCompanyId(id, companyId).orElseThrow(() -> notFound("Budget not found"));
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
        Transaction tx = transactions.save(Transaction.builder().companyId(companyId).warehouseId(request.warehouseId())
                .type(request.type()).category(request.category()).amount(request.amount().setScale(2, RoundingMode.HALF_UP))
                .refDocumentId(request.refDocumentId()).note(request.note()).build());
        recordAudit(companyId,user.id(),"CREATE_TRANSACTION",tx.getId().toString(),Map.of("type",request.type().name(),"amount",request.amount(),"category",request.category().name()));
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
    private void conflict(String message) { throw new ResponseStatusException(HttpStatus.CONFLICT, message); }
    private ResponseStatusException notFound(String message) { return new ResponseStatusException(HttpStatus.NOT_FOUND, message); }
}
