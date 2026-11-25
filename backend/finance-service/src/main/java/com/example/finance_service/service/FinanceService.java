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
    private final WalletLedger ledger;
    private final BudgetRepository budgets;
    private final TransactionRepository transactions;
    private final FinanceAccessService access;
    private final FinancePeriods periods;
    private final FinanceReportRepository reports;

    public BudgetResponse createBudget(UUID companyId, BudgetRequest request) {
        period(request.period());
        if (budgets.existsByCompanyIdAndWarehouseIdAndPeriod(companyId, request.warehouseId(), request.period())) conflict("Đã có ngân sách cho kỳ và phạm vi này. Hãy mở mục Ngân sách và chọn Điều chỉnh.");
        Budget b = budgets.save(Budget.builder().companyId(companyId).warehouseId(request.warehouseId()).allocated(request.allocated()).period(request.period()).build());
        return budgetResponse(b);
    }
    public BudgetResponse updateBudget(UUID companyId, UUID id, BudgetRequest request) {
        period(request.period());
        Budget b = budgets.findByIdAndCompanyId(id, companyId).orElseThrow(() -> notFound("Budget not found"));
        if (budgets.existsByCompanyIdAndWarehouseIdAndPeriodAndIdNot(companyId, request.warehouseId(), request.period(), id)) conflict("Đã có ngân sách cho kỳ và phạm vi này. Hãy mở mục Ngân sách và chọn Điều chỉnh.");
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
        var ref=request.refDocumentId()==null?UUID.randomUUID():request.refDocumentId();
        var tx=ledger.post("MANUAL_"+request.type()+"_"+request.category(),companyId,request.warehouseId(),user.id(),
                ref,false,request.amount(),request.type(),request.category(),request.note());
        return TransactionResponse.from(tx);
    }
    @Transactional(readOnly=true)
    public Page<TransactionResponse> transactions(UUID companyId, UUID warehouseId, TransactionType type, String period, Pageable pageable, Identity user) {
        access.warehouse(user, warehouseId, companyId);
        Instant[] range = period(period);
        Page<Transaction> page;
        if (companyId == null && "SYSTEM_ADMIN".equals(user.role())) {
            page = transactions.findAll((root, query, cb) -> {
                var filters = new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();
                filters.add(cb.greaterThanOrEqualTo(root.get("createdAt"), range[0]));
                filters.add(cb.lessThan(root.get("createdAt"), range[1]));
                if (warehouseId != null) filters.add(cb.equal(root.get("warehouseId"), warehouseId));
                if (type != null) filters.add(cb.equal(root.get("type"), type));
                return cb.and(filters.toArray(jakarta.persistence.criteria.Predicate[]::new));
            }, pageable);
        } else if (warehouseId != null) page = type == null
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
