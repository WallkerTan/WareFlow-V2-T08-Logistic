package com.example.finance_service;

import com.example.finance_service.service.FinancePeriods;
import com.example.finance_service.service.FinancePeriods.GroupBy;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import static org.junit.jupiter.api.Assertions.*;

class FinancePeriodsTests {
    private final FinancePeriods periods = new FinancePeriods("Asia/Ho_Chi_Minh");
    @Test void monthUsesVietnamMidnightAndLeapYear() {
        var p=periods.parse("2024-02");
        assertEquals(Instant.parse("2024-01-31T17:00:00Z"),p.from());
        assertEquals(Instant.parse("2024-02-29T17:00:00Z"),p.to());
        assertEquals(29,java.time.temporal.ChronoUnit.DAYS.between(p.start(),p.end()));
        assertEquals(GroupBy.DAY,p.defaultGroup());
    }
    @Test void quarterAndYearUseMonthlyBuckets() {
        var q=periods.parse("Q4-2026");
        assertEquals(LocalDate.of(2026,10,1),q.start());
        assertEquals(LocalDate.of(2027,1,1),q.end());
        assertEquals(GroupBy.MONTH,q.defaultGroup());
        assertEquals(Instant.parse("2025-12-31T17:00:00Z"),periods.parse("2026").from());
        assertEquals(Instant.parse("2026-12-31T17:00:00Z"),periods.parse("2026").to());
    }
    @Test void rejectsInvalidPeriods() {
        for (String value : new String[]{null,"","2026-13","2026-1","Q0-2026","Q5-2026","2026-01-01","0000"," 2026","-2026"}) {
            assertEquals(400,assertThrows(ResponseStatusException.class,()->periods.parse(value)).getStatusCode().value());
        }
    }
    @Test void timezoneIsConfigurable() {
        assertEquals(Instant.parse("2026-01-01T00:00:00Z"),new FinancePeriods("UTC").parse("2026-01").from());
    }
}
