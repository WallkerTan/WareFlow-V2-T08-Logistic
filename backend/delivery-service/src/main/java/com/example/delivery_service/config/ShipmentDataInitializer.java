package com.example.delivery_service.config;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.hibernate.Session;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class ShipmentDataInitializer implements ApplicationRunner {
    private final EntityManager em;
    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        boolean postgres = em.unwrap(Session.class).doReturningWork(connection ->
                "PostgreSQL".equals(connection.getMetaData().getDatabaseProductName()));
        if (postgres) em.createNativeQuery("""
            do $$
            begin
                if exists (
                    select 1 from pg_constraint
                    where conrelid = cast('shipments' as regclass) and conname = 'shipments_status_check'
                      and pg_get_constraintdef(oid) not like '%CANCELLED%'
                ) then
                    alter table shipments drop constraint shipments_status_check,
                        add constraint shipments_status_check
                        check (status in ('CREATED', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETURNED', 'CANCELLED'));
                end if;
            end;
            $$
            """).executeUpdate();
        var duplicates = em.createNativeQuery("""
            select document_id from shipments group by document_id having count(*) > 1
            """, Object.class).getResultList();
        var trackingDuplicates = em.createNativeQuery("""
            select warehouse_id from shipments group by warehouse_id, carrier, tracking_code having count(*) > 1
            """, Object.class).getResultList();
        if (!duplicates.isEmpty() || !trackingDuplicates.isEmpty())
            throw new IllegalStateException("Duplicate shipments: resolve existing data before starting delivery-service");
        em.createNativeQuery("update shipments set cod_amount = 0 where cod_amount is null").executeUpdate();
        em.createNativeQuery("""
            update shipments set cod_status = case when cod_amount = 0 then 'NOT_REQUIRED' else 'PENDING' end
            where cod_status is null
            """).executeUpdate();
    }
}
