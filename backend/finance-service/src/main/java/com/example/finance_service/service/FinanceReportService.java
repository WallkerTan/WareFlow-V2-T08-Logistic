package com.example.finance_service.service;

import com.example.finance_service.dto.*;
import com.example.finance_service.entity.enums.TransactionCategory;
import com.example.finance_service.repository.FinanceReportRepository;
import com.example.finance_service.security.FinanceAccessService;
import com.example.finance_service.security.FinanceAccessService.Identity;
import com.example.finance_service.service.FinancePeriods.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly=true)
public class FinanceReportService {
    private static final FinanceSummary ZERO = new FinanceSummary(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
    private final FinancePeriods periods;
    private final FinanceReportRepository reports;
    private final FinanceAccessService access;

    public FinanceTimeseries timeseries(UUID company, UUID warehouse, String value, GroupBy requested, Identity user) {
        access.warehouse(user, warehouse, company);
        var period = periods.parse(value);
        var group = requested == null ? period.defaultGroup() : requested;
        var values = reports.timeseries(company, warehouse, period, group);
        var points = new ArrayList<FinanceTimeseries.Point>();
        for (LocalDate date = period.start(); date.isBefore(period.end());
            date = group == GroupBy.DAY ? date.plusDays(1) : date.plusMonths(1)) {
            var total = values.getOrDefault(date, ZERO);
            points.add(new FinanceTimeseries.Point(date, total.income(), total.expense(), total.systemFee(), total.net()));
        }
        return new FinanceTimeseries(value, period.timezone(), group, List.copyOf(points));
    }
    public FinanceCategories categories(UUID company, UUID warehouse, String value, Identity user) {
        access.warehouse(user, warehouse, company);
        var period = periods.parse(value);
        var values = reports.categories(company, warehouse, period);
        var items = new ArrayList<FinanceCategories.Item>();
        for (var category : TransactionCategory.values()) {
            var total = values.getOrDefault(category, ZERO);
            items.add(new FinanceCategories.Item(category, total.income(), total.expense(), total.systemFee(), total.net()));
        }
        return new FinanceCategories(value, period.timezone(), List.copyOf(items));
    }
}
