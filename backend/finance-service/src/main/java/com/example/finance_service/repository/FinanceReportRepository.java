package com.example.finance_service.repository;

import com.example.finance_service.dto.FinanceSummary;
import com.example.finance_service.entity.enums.TransactionCategory;
import com.example.finance_service.service.FinancePeriods.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.*;
import org.springframework.stereotype.Repository;
import java.sql.*;
import java.time.LocalDate;
import java.util.*;

@Repository
@RequiredArgsConstructor
public class FinanceReportRepository {
    private final NamedParameterJdbcTemplate jdbc;
    private static final String TOTALS = """
        COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) AS expense,
        COALESCE(SUM(CASE WHEN type = 'SYSTEM_FEE' THEN amount ELSE 0 END), 0) AS system_fee
        """;
    private static final String WHERE = """
         FROM transactions WHERE company_id = :company
         AND created_at >= :from AND created_at < :to
        """;
    private MapSqlParameterSource parameters(UUID company, UUID warehouse, PeriodRange period) {
        return new MapSqlParameterSource().addValue("company", company).addValue("warehouse", warehouse)
            .addValue("from", Timestamp.from(period.from())).addValue("to", Timestamp.from(period.to()))
            .addValue("timezone", period.timezone());
    }
    private String scope(UUID warehouse) { return WHERE + (warehouse == null ? "" : " AND warehouse_id = :warehouse "); }
    private FinanceSummary totals(ResultSet rs) throws SQLException {
        var income = rs.getBigDecimal("income");
        var expense = rs.getBigDecimal("expense");
        var fee = rs.getBigDecimal("system_fee");
        return new FinanceSummary(income, expense, fee, income.subtract(expense).subtract(fee));
    }
    public FinanceSummary summary(UUID company, UUID warehouse, PeriodRange period) {
        return jdbc.queryForObject("SELECT " + TOTALS + scope(warehouse), parameters(company, warehouse, period),
            (rs, row) -> totals(rs));
    }
    public Map<LocalDate, FinanceSummary> timeseries(UUID company, UUID warehouse, PeriodRange period, GroupBy group) {
        // Only enum-controlled SQL is interpolated; all user inputs remain bound parameters.
        String unit = group == GroupBy.DAY ? "day" : "month";
        String sql = "SELECT CAST(date_trunc('" + unit +
            "', created_at AT TIME ZONE :timezone) AS date) AS bucket, " + TOTALS +
            scope(warehouse) + " GROUP BY bucket ORDER BY bucket";
        var result = new LinkedHashMap<LocalDate, FinanceSummary>();
        jdbc.query(sql, parameters(company, warehouse, period), (org.springframework.jdbc.core.RowCallbackHandler)
            rs -> result.put(rs.getDate("bucket").toLocalDate(), totals(rs)));
        return result;
    }
    public Map<TransactionCategory, FinanceSummary> categories(UUID company, UUID warehouse, PeriodRange period) {
        var result = new EnumMap<TransactionCategory, FinanceSummary>(TransactionCategory.class);
        jdbc.query("SELECT category, " + TOTALS + scope(warehouse) + " GROUP BY category",
            parameters(company, warehouse, period), (org.springframework.jdbc.core.RowCallbackHandler)
            rs -> result.put(TransactionCategory.valueOf(rs.getString("category")), totals(rs)));
        return result;
    }
}
