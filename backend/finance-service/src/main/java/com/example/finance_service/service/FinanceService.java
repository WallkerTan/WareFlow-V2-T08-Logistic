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
import java.time.format.*;
import java.util.*;

@Service @RequiredArgsConstructor @Transactional
public class FinanceService {
    private static final BigDecimal FEE_RATE = new BigDecimal("0.05");
    private final BudgetRepository budgets;
    private final TransactionRepository transactions;
    private final FinanceAccessService access;

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
        if (request.type() == TransactionType.INCOME && request.category() == TransactionCategory.SALE) {
            BigDecimal fee = tx.getAmount().multiply(FEE_RATE).setScale(2, RoundingMode.HALF_UP);
            if (fee.signum() > 0 && (tx.getRefDocumentId() == null || !transactions.existsByCompanyIdAndRefDocumentIdAndType(companyId, tx.getRefDocumentId(), TransactionType.SYSTEM_FEE))) {
                transactions.save(Transaction.builder().companyId(companyId).warehouseId(tx.getWarehouseId()).type(TransactionType.SYSTEM_FEE)
                        .category(TransactionCategory.FEE).amount(fee).refDocumentId(tx.getRefDocumentId()).note("5% platform fee for transaction " + tx.getId()).build());
            }
        }
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
        Instant[] range = period(period);
        List<Transaction> all = warehouseId == null
                ? transactions.findByCompanyIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(companyId, range[0], range[1])
                : transactions.findByCompanyIdAndWarehouseIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(companyId, warehouseId, range[0], range[1]);
        BigDecimal income = sum(all, TransactionType.INCOME), expense = sum(all, TransactionType.EXPENSE), fee = sum(all, TransactionType.SYSTEM_FEE);
        return new FinanceSummary(income, expense, fee, income.subtract(expense).subtract(fee));
    }
    private BudgetResponse budgetResponse(Budget budget) {
        Instant[] range = period(budget.getPeriod());
        List<Transaction> all = transactions.findByCompanyIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(budget.getCompanyId(), range[0], range[1]);
        BigDecimal spent = all.stream().filter(t -> t.getType() == TransactionType.EXPENSE || t.getType() == TransactionType.SYSTEM_FEE)
                .filter(t -> budget.getWarehouseId() == null || budget.getWarehouseId().equals(t.getWarehouseId()))
                .map(Transaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        return BudgetResponse.from(budget, spent);
    }
    private BigDecimal sum(List<Transaction> all, TransactionType type) { return all.stream().filter(t -> t.getType() == type).map(Transaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add); }
    private Instant[] period(String value) {
        if (value == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "period is required (YYYY-MM, YYYY, or Q1-YYYY)");
        try {
            YearMonth month = YearMonth.parse(value); return bounds(month.atDay(1), month.plusMonths(1).atDay(1));
        } catch (DateTimeParseException ignored) { }
        try { Year year = Year.parse(value); return bounds(year.atDay(1), year.plusYears(1).atDay(1)); }
        catch (DateTimeParseException ignored) { }
        if (value.matches("Q[1-4]-\\d{4}")) {
            int quarter = Integer.parseInt(value.substring(1, 2)); int year = Integer.parseInt(value.substring(3));
            LocalDate start = LocalDate.of(year, (quarter - 1) * 3 + 1, 1); return bounds(start, start.plusMonths(3));
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid period; use YYYY-MM, YYYY, or Q1-YYYY");
    }
    private Instant[] bounds(LocalDate from, LocalDate to) { return new Instant[]{from.atStartOfDay(ZoneOffset.UTC).toInstant(), to.atStartOfDay(ZoneOffset.UTC).toInstant()}; }
    private void bad(String message) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
    private void conflict(String message) { throw new ResponseStatusException(HttpStatus.CONFLICT, message); }
    private ResponseStatusException notFound(String message) { return new ResponseStatusException(HttpStatus.NOT_FOUND, message); }
}
