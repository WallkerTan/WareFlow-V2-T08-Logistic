package com.example.finance_service.service;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
@Component @RequiredArgsConstructor
public class BudgetConstraints implements ApplicationRunner {
    private final JdbcTemplate jdbc;
    @Override public void run(ApplicationArguments args){
        String database=jdbc.execute((org.springframework.jdbc.core.ConnectionCallback<String>)c->c.getMetaData().getDatabaseProductName());
        if(!"PostgreSQL".equals(database))return;
        jdbc.execute("create unique index if not exists budgets_warehouse_period_unique on budgets (company_id,warehouse_id,period) where warehouse_id is not null");
        jdbc.execute("create unique index if not exists budgets_company_period_unique on budgets (company_id,period) where warehouse_id is null");
    }
}
