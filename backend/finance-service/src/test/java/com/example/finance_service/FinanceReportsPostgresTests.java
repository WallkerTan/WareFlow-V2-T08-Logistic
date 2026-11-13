package com.example.finance_service;

import com.example.finance_service.dto.*;
import com.example.finance_service.service.*;
import com.example.finance_service.service.FinancePeriods.GroupBy;
import com.example.finance_service.security.FinanceAccessService.Identity;
import com.example.finance_service.entity.enums.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.*;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
@EnabledIfEnvironmentVariable(named="FINANCE_TEST_DB_URL",matches="jdbc:postgresql:.*")
class FinanceReportsPostgresTests {
    @Autowired FinanceService finance;
    @Autowired FinanceReportService charts;
    @Autowired JdbcTemplate jdbc;
    final UUID company=UUID.randomUUID(), warehouse=UUID.randomUUID();
    final Identity admin=new Identity(UUID.randomUUID(),null,"SYSTEM_ADMIN","unused");
    void tx(UUID c,UUID w,String type,String category,String amount,String at) {
        jdbc.update("insert into transactions(company_id,warehouse_id,type,category,amount,created_at) values (?,?,?,?,?,?)",
            c,w,type,category,new BigDecimal(amount),Timestamp.from(Instant.parse(at)));
    }
    void seed() {
        tx(company,warehouse,"INCOME","SALE","100","2026-10-31T17:00:00Z");
        tx(company,warehouse,"EXPENSE","PURCHASE","30","2026-11-01T16:59:59Z");
        tx(company,warehouse,"SYSTEM_FEE","FEE","5","2026-11-01T17:00:00Z");
        tx(company,null,"INCOME","OTHER","20","2026-11-15T10:00:00Z");
        tx(company,UUID.randomUUID(),"EXPENSE","OTHER","7","2026-11-15T10:00:00Z");
        tx(company,warehouse,"INCOME","SALE","999","2026-10-31T16:59:59.999999Z");
        tx(company,warehouse,"INCOME","SALE","999","2026-11-30T17:00:00Z");
        tx(UUID.randomUUID(),warehouse,"INCOME","SALE","999","2026-11-01T17:00:00Z");
    }
    void money(String expected,BigDecimal actual) { assertEquals(0,new BigDecimal(expected).compareTo(actual)); }
    @Test void allReportsReconcileAndRespectVietnamBoundaries() {
        seed();
        var total=finance.summary(company,null,"2026-11",admin);
        money("120",total.income()); money("37",total.expense()); money("5",total.systemFee()); money("78",total.net());
        var series=charts.timeseries(company,null,"2026-11",null,admin);
        assertEquals(30,series.points().size());
        assertEquals(GroupBy.DAY,series.groupBy());
        assertEquals("Asia/Ho_Chi_Minh",series.timezone());
        money("100",series.points().getFirst().income()); money("30",series.points().getFirst().expense());
        money("5",series.points().get(1).systemFee()); money("0",series.points().get(2).net());
        money("120",series.points().stream().map(FinanceTimeseries.Point::income).reduce(BigDecimal.ZERO,BigDecimal::add));
        money("37",series.points().stream().map(FinanceTimeseries.Point::expense).reduce(BigDecimal.ZERO,BigDecimal::add));
        money("5",series.points().stream().map(FinanceTimeseries.Point::systemFee).reduce(BigDecimal.ZERO,BigDecimal::add));
        money("78",series.points().stream().map(FinanceTimeseries.Point::net).reduce(BigDecimal.ZERO,BigDecimal::add));
        var categories=charts.categories(company,null,"2026-11",admin);
        assertEquals(TransactionCategory.values().length,categories.items().size());
        money("120",categories.items().stream().map(FinanceCategories.Item::income).reduce(BigDecimal.ZERO,BigDecimal::add));
        money("37",categories.items().stream().map(FinanceCategories.Item::expense).reduce(BigDecimal.ZERO,BigDecimal::add));
        money("5",categories.items().stream().map(FinanceCategories.Item::systemFee).reduce(BigDecimal.ZERO,BigDecimal::add));
        money("78",categories.items().stream().map(FinanceCategories.Item::net).reduce(BigDecimal.ZERO,BigDecimal::add));
        for (int i=0;i<categories.items().size();i++) assertEquals(TransactionCategory.values()[i],categories.items().get(i).category());
    }
    @Test void warehouseScopeExcludesUnassignedAndOtherWarehouseTransactions() {
        seed();
        var total=finance.summary(company,warehouse,"2026-11",admin);
        money("100",total.income()); money("30",total.expense()); money("65",total.net());
        var series=charts.timeseries(company,warehouse,"2026-11",GroupBy.MONTH,admin);
        assertEquals(1,series.points().size()); money("65",series.points().getFirst().net());
        money("65",charts.categories(company,warehouse,"2026-11",admin).items().stream()
            .map(FinanceCategories.Item::net).reduce(BigDecimal.ZERO,BigDecimal::add));
        money("0",finance.summary(UUID.randomUUID(),null,"2026-11",admin).income());
    }
    @Test void transactionsAndBudgetUseSamePeriodAsSummary() {
        seed();
        var page=finance.transactions(company,warehouse,null,"2026-11",PageRequest.of(0,20),admin);
        assertEquals(3,page.getTotalElements());
        var budget=finance.createBudget(company,new BudgetRequest(new BigDecimal("500"),"2026-11",warehouse));
        money("35",budget.spent());
    }
    @Test void emptyPeriodsHaveZeroFilledLeapDaysAndMonths() {
        var days=charts.timeseries(company,null,"2024-02",null,admin);
        assertEquals(29,days.points().size()); assertEquals(LocalDate.of(2024,2,29),days.points().getLast().date());
        assertTrue(days.points().stream().allMatch(p->p.net().signum()==0));
        assertEquals(12,charts.timeseries(company,null,"2026",null,admin).points().size());
        assertEquals(366,charts.timeseries(company,null,"2024",GroupBy.DAY,admin).points().size());
        assertEquals(3,charts.timeseries(company,null,"Q4-2026",null,admin).points().size());
        assertTrue(charts.categories(company,null,"2026",admin).items().stream().allMatch(i->i.income().signum()==0));
    }
    @Test void monthlyBucketsDoNotDependOnDatabaseSessionTimezone() {
        jdbc.execute("SET LOCAL TIME ZONE 'America/New_York'");
        tx(company,warehouse,"INCOME","SALE","12.34","2025-12-31T17:00:00Z");
        tx(company,warehouse,"EXPENSE","OTHER","2.34","2026-01-31T17:00:00Z");
        var points=charts.timeseries(company,null,"2026",null,admin).points();
        money("12.34",points.get(0).income()); money("2.34",points.get(1).expense());
        assertEquals(LocalDate.of(2026,1,1),points.get(0).date());
        money("10.00",finance.summary(company,null,"2026",admin).net());
    }
}
