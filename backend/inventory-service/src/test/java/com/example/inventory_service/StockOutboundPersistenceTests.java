package com.example.inventory_service;

import com.example.inventory_service.dto.CreateExportRequest;
import com.example.inventory_service.entity.*;
import com.example.inventory_service.entity.enums.*;
import com.example.inventory_service.repository.*;
import com.example.inventory_service.security.WarehouseAccessService.UserIdentity;
import com.example.inventory_service.service.StockOutboundService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest(properties = {"spring.cloud.config.enabled=false", "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.datasource.url=jdbc:h2:mem:outbound;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(StockOutboundService.class)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class StockOutboundPersistenceTests {
    @Autowired StockOutboundService service;
    @Autowired ProductRepository products;
    @Autowired StockLotRepository lots;
    @Autowired StockDocumentRepository documents;
    @Autowired StockMovementRepository movements;
    @Autowired PlatformTransactionManager transactionManager;
    UserIdentity user = new UserIdentity(UUID.randomUUID(), UUID.randomUUID(), "COMPANY_ADMIN");

    record Fixture(UUID warehouse, UUID targetWarehouse, UUID lot, UUID targetProduct) { }
    Fixture fixture() {
        return new TransactionTemplate(transactionManager).execute(s -> {
            UUID warehouse = UUID.randomUUID(), targetWarehouse = UUID.randomUUID();
            Product source = products.save(Product.builder().warehouseId(warehouse).sku("SKU").name("Product").unit("box").build());
            Product target = products.save(Product.builder().warehouseId(targetWarehouse).sku("SKU").name("Product").unit("box").build());
            StockLot lot = lots.save(StockLot.builder().product(source).lotCode("BATCH").quantity(new BigDecimal("10")).build());
            return new Fixture(warehouse, targetWarehouse, lot.getId(), target.getId());
        });
    }
    UUID pending(Fixture f, boolean transfer) {
        var request = new CreateExportRequest(transfer ? StockDocumentType.EXPORT_TRANSFER : StockDocumentType.EXPORT_SALE,
                transfer ? f.targetWarehouse() : null,
                List.of(new CreateExportRequest.Line(f.lot(), new BigDecimal("6"), transfer ? f.targetProduct() : null)), null);
        UUID id = service.create(f.warehouse(), request, user).id();
        service.transition(f.warehouse(), id, "submit", null, user);
        return id;
    }

    @Test void persistedTransferCanBeCompletedOnlyOnce() {
        Fixture f = fixture(); UUID id = pending(f, true);
        service.transition(f.warehouse(), id, "approve", null, user);
        var result = service.transition(f.warehouse(), id, "complete", null, user);
        service.transition(f.warehouse(), id, "complete", null, user);
        assertEquals(0, new BigDecimal("4").compareTo(lots.findById(f.lot()).orElseThrow().getQuantity()));
        UUID targetLot = UUID.fromString(result.lines().getFirst().get("targetLotId").toString());
        assertEquals(0, new BigDecimal("6").compareTo(lots.findById(targetLot).orElseThrow().getQuantity()));
        assertEquals(2, movements.findAll().stream().filter(m -> id.equals(m.getDocumentId())).count());
        assertNotNull(service.get(f.warehouse(), id).lines().getFirst().get("targetLotId"));
    }

    @Test void staleLotUpdateCannotOverwriteAnotherStockOperation() {
        Fixture f = fixture();
        StockLot first = lots.findById(f.lot()).orElseThrow();
        StockLot stale = lots.findById(f.lot()).orElseThrow();
        first.setQuantity(new BigDecimal("15"));
        lots.saveAndFlush(first);
        stale.setReserved(BigDecimal.ONE);
        assertThrows(org.springframework.dao.OptimisticLockingFailureException.class, () -> lots.saveAndFlush(stale));
        assertEquals(0, new BigDecimal("15").compareTo(lots.findById(f.lot()).orElseThrow().getQuantity()));
    }

    @Test void invalidDestinationRollsBackSourceAndMovement() {
        Fixture f = fixture(); UUID id = pending(f, true);
        service.transition(f.warehouse(), id, "approve", null, user);
        new TransactionTemplate(transactionManager).executeWithoutResult(s -> {
            Product target = products.findById(f.targetProduct()).orElseThrow();
            target.setUnit("different"); products.save(target);
        });
        assertThrows(ResponseStatusException.class, () -> service.transition(f.warehouse(), id, "complete", null, user));
        StockLot lot = lots.findById(f.lot()).orElseThrow();
        assertEquals(0, new BigDecimal("10").compareTo(lot.getQuantity()));
        assertEquals(0, new BigDecimal("6").compareTo(lot.getReserved()));
        assertEquals(StockDocumentStatus.APPROVED, documents.findById(id).orElseThrow().getStatus());
        assertEquals(0, movements.findAll().stream().filter(m -> id.equals(m.getDocumentId())).count());
    }

    @Test void concurrentApprovalsCannotOverReserve() throws Exception {
        Fixture f = fixture(); UUID first = pending(f, false), second = pending(f, false);
        CountDownLatch start = new CountDownLatch(1);
        try (ExecutorService pool = Executors.newFixedThreadPool(2)) {
            List<Future<Boolean>> results = new ArrayList<>();
            for (UUID id : List.of(first, second)) results.add(pool.submit(() -> {
                start.await();
                try { service.transition(f.warehouse(), id, "approve", null, user); return true; }
                catch (ResponseStatusException ex) { assertEquals(409, ex.getStatusCode().value()); return false; }
            }));
            start.countDown();
            int success = 0;
            for (Future<Boolean> result : results) if (result.get(15, TimeUnit.SECONDS)) success++;
            assertEquals(1, success);
        }
        assertEquals(0, new BigDecimal("6").compareTo(lots.findById(f.lot()).orElseThrow().getReserved()));
    }
}
