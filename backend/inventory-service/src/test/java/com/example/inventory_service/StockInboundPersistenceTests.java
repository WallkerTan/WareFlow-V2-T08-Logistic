package com.example.inventory_service;

import com.example.inventory_service.dto.*;
import com.example.inventory_service.entity.enums.*;
import com.example.inventory_service.repository.StockDocumentRepository;
import com.example.inventory_service.security.WarehouseAccessService.UserIdentity;
import com.example.inventory_service.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest(properties = {"spring.cloud.config.enabled=false", "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.datasource.url=jdbc:h2:mem:inbound;MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({StockInboundService.class, InventoryCatalogService.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class StockInboundPersistenceTests {
    @Autowired StockInboundService inbound;
    @Autowired InventoryCatalogService catalog;
    @Autowired StockDocumentRepository documents;

    @Test void supplierProductHasNoStockUntilReceiptAndPartialReceiptsCompleteExactlyOnce() {
        UUID warehouse = UUID.randomUUID(), company = UUID.randomUUID();
        var manager = new UserIdentity(UUID.randomUUID(), company, "WAREHOUSE_MANAGER");
        var admin = new UserIdentity(UUID.randomUUID(), company, "COMPANY_ADMIN");
        var product = catalog.createProduct(warehouse, new ProductRequest("SUPPLIER-SKU", null, "Hàng nhà cung cấp", "cái", List.of(), BigDecimal.ZERO));
        assertEquals(0, product.quantity().signum());
        var po = inbound.createPurchaseOrder(warehouse, new CreatePurchaseOrderRequest("Nhà cung cấp", UUID.randomUUID(), null, null, true,
                List.of(new PurchaseOrderLineRequest(product.id(), new BigDecimal("3"), new BigDecimal("20000"), null))), manager);
        inbound.approvePurchaseOrder(warehouse, po.id(), "Duyệt nhập", admin);
        var first = new CreateReceiptRequest(po.id(), null, true, List.of(new ReceiptLineRequest(product.id(), BigDecimal.ONE, "LOT-SUPPLIER", null, StockLotStatus.OK)));
        inbound.createReceipt(warehouse, first, manager);
        assertEquals(0, BigDecimal.ONE.compareTo(catalog.getProduct(warehouse, product.id()).quantity()));
        assertEquals(StockDocumentStatus.APPROVED, documents.findById(po.id()).orElseThrow().getStatus());
        var remaining = new CreateReceiptRequest(po.id(), null, true, List.of(new ReceiptLineRequest(product.id(), new BigDecimal("2"), "LOT-SUPPLIER", null, StockLotStatus.OK)));
        inbound.createReceipt(warehouse, remaining, manager);
        assertEquals(0, new BigDecimal("3").compareTo(catalog.getProduct(warehouse, product.id()).quantity()));
        assertEquals(StockDocumentStatus.DONE, documents.findById(po.id()).orElseThrow().getStatus());
        assertThrows(ResponseStatusException.class, () -> inbound.createReceipt(warehouse, remaining, manager));
        assertEquals(0, new BigDecimal("3").compareTo(catalog.getProduct(warehouse, product.id()).quantity()));
        assertEquals(2, documents.findReceiptsByPoId(warehouse, po.id().toString()).size());
    }
}
