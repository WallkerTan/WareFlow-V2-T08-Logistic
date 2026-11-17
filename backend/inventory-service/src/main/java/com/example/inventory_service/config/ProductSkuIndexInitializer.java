package com.example.inventory_service.config;

import java.util.List;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Replaces the legacy globally unique SKU constraint with per-warehouse uniqueness. */
@Component
public class ProductSkuIndexInitializer implements ApplicationRunner {
    private final JdbcTemplate jdbc;

    public ProductSkuIndexInitializer(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Override
    public void run(ApplicationArguments args) {
        List<String> legacyConstraints = jdbc.queryForList("""
                select c.conname
                from pg_constraint c
                join pg_class t on t.oid = c.conrelid
                join pg_namespace n on n.oid = t.relnamespace
                where n.nspname = current_schema()
                  and t.relname = 'products'
                  and c.contype = 'u'
                  and (select array_agg(a.attname order by a.attname)
                       from unnest(c.conkey) as cols(attnum)
                       join pg_attribute a on a.attrelid = t.oid and a.attnum = cols.attnum)
                      = array['sku']::name[]
                """, String.class);
        for (String constraint : legacyConstraints) {
            String safeName = constraint.replace("\"", "\"\"");
            jdbc.execute("alter table products drop constraint \"" + safeName + "\"");
        }
        jdbc.execute("create unique index if not exists uk_products_warehouse_active_sku " +
                "on products (warehouse_id, lower(sku)) where deleted_at is null");
    }
}
