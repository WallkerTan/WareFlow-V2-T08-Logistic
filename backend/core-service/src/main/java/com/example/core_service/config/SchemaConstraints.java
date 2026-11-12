package com.example.core_service.config;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.ApplicationArguments;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
@Component @Order(-100) @RequiredArgsConstructor
public class SchemaConstraints implements ApplicationRunner {
    private final JdbcTemplate jdbc;
    @Override public void run(ApplicationArguments args){
        String database=jdbc.execute((org.springframework.jdbc.core.ConnectionCallback<String>)c->c.getMetaData().getDatabaseProductName());
        if(!"PostgreSQL".equals(database))return;
        jdbc.execute("create unique index if not exists users_one_system_admin on users (role) where role='SYSTEM_ADMIN'");
        jdbc.execute("create unique index if not exists users_email_lower_unique on users (lower(email))");
        jdbc.execute("create unique index if not exists companies_name_lower_unique on companies (lower(name))");
        jdbc.execute("create unique index if not exists warehouses_name_lower_unique on warehouses (lower(name))");
    }
}
