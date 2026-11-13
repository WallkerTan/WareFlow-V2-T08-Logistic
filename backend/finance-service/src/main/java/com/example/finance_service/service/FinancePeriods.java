package com.example.finance_service.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;

@Component
public class FinancePeriods {
    private final ZoneId zone;
    public FinancePeriods(@Value("${wareflow.finance.timezone:Asia/Ho_Chi_Minh}") String timezone) {
        zone = ZoneId.of(timezone);
    }
    public PeriodRange parse(String value) {
        try {
            if (value != null && value.matches("[0-9]{4}-[0-9]{2}")) {
                YearMonth month = YearMonth.parse(value);
                return range(month.atDay(1), month.plusMonths(1).atDay(1), GroupBy.DAY);
            }
            if (value != null && value.matches("[0-9]{4}")) {
                Year year = Year.parse(value);
                return range(year.atDay(1), year.plusYears(1).atDay(1), GroupBy.MONTH);
            }
            if (value != null && value.matches("Q[1-4]-[0-9]{4}")) {
                int quarter = value.charAt(1) - '0';
                LocalDate start = LocalDate.of(Integer.parseInt(value.substring(3)), (quarter - 1) * 3 + 1, 1);
                return range(start, start.plusMonths(3), GroupBy.MONTH);
            }
        } catch (DateTimeException | NumberFormatException ignored) { }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid period; use YYYY-MM, YYYY, or Q1-YYYY (years 0001–9999)");
    }
    private PeriodRange range(LocalDate start, LocalDate end, GroupBy defaultGroup) {
        if (start.getYear() < 1 || start.getYear() > 9999) throw new DateTimeException("Year out of range");
        return new PeriodRange(start, end, start.atStartOfDay(zone).toInstant(),
            end.atStartOfDay(zone).toInstant(), zone.getId(), defaultGroup);
    }
    public enum GroupBy { DAY, MONTH }
    public record PeriodRange(LocalDate start, LocalDate end, Instant from, Instant to,
        String timezone, GroupBy defaultGroup) {}
}
