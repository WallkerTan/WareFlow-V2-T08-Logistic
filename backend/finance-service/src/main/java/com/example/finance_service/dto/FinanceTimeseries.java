package com.example.finance_service.dto;

import com.example.finance_service.service.FinancePeriods.GroupBy;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record FinanceTimeseries(String period, String timezone, GroupBy groupBy, List<Point> points) {
    public record Point(LocalDate date, BigDecimal income, BigDecimal expense, BigDecimal systemFee, BigDecimal net) {}
}
