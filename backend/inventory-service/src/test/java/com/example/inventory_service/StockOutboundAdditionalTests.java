package com.example.inventory_service;

import com.example.inventory_service.dto.CreateExportRequest;
import com.example.inventory_service.entity.*;
import com.example.inventory_service.entity.enums.*;
import com.example.inventory_service.repository.*;
import com.example.inventory_service.security.WarehouseAccessService.UserIdentity;
import com.example.inventory_service.service.StockOutboundService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import java.time.Instant;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StockOutboundAdditionalTests {
    @Mock StockDocumentRepository documents;
    @Mock StockLotRepository lots;
    @Mock ProductRepository products;
    @Mock StockMovementRepository movements;
    StockOutboundService service;
    UUID warehouse = UUID.randomUUID(), destination = UUID.randomUUID(), id = UUID.randomUUID();
    UserIdentity user = new UserIdentity(UUID.randomUUID(), UUID.randomUUID(), "COMPANY_ADMIN");
    Product source;
    StockLot lot;
    StockDocument doc;

    @BeforeEach void setup() {
        service = new StockOutboundService(documents, lots, products, movements);
        source = Product.builder().id(UUID.randomUUID()).warehouseId(warehouse).sku("SKU-1").unit("box").build();
        lot = StockLot.builder().id(UUID.randomUUID()).product(source).lotCode("BATCH-1")
                .quantity(new BigDecimal("10")).reserved(BigDecimal.ZERO).build();
        Map<String, Object> line = new LinkedHashMap<>();
        line.put("lotId", lot.getId().toString()); line.put("quantity", new BigDecimal("4"));
        doc = StockDocument.builder().id(id).warehouseId(warehouse).type(StockDocumentType.EXPORT_SALE)
                .status(StockDocumentStatus.PENDING_APPROVAL).lines(new ArrayList<>(List.of(line)))
                .approval(new LinkedHashMap<>()).build();
    }
    void loadDoc() {
        when(documents.findByIdAndWarehouseIdForUpdate(id, warehouse)).thenReturn(Optional.of(doc));
    }
    void loadLot() { when(lots.findForUpdate(lot.getId(), warehouse)).thenReturn(Optional.of(lot)); }
    void saveDoc() { when(documents.save(any())).thenAnswer(i -> i.getArgument(0)); }
    CreateExportRequest request(StockDocumentType type, UUID targetWarehouse, UUID targetProduct) {
        return new CreateExportRequest(type, targetWarehouse,
                List.of(new CreateExportRequest.Line(lot.getId(), new BigDecimal("4"), targetProduct)), "test");
    }
    void assertConflict(Runnable action) {
        assertEquals(409, assertThrows(ResponseStatusException.class, action::run).getStatusCode().value());
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1", "-0.01"})
    void rejectsNonPositiveExportQuantity(String quantity) {
        var request = new CreateExportRequest(StockDocumentType.EXPORT_SALE, null,
                List.of(new CreateExportRequest.Line(lot.getId(), new BigDecimal(quantity), null)), null);
        assertBadRequest(() -> service.create(warehouse, request, user));
        verifyNoInteractions(lots, documents, movements);
    }

    @Test void rejectsEmptyExport() {
        assertBadRequest(() -> service.create(warehouse,
                new CreateExportRequest(StockDocumentType.EXPORT_SALE, null, List.of(), null), user));
        verifyNoInteractions(lots, documents, movements);
    }

    @Test void rejectsSaleWithDestinationWarehouse() {
        assertBadRequest(() -> service.create(warehouse,
                request(StockDocumentType.EXPORT_SALE, destination, null), user));
        verifyNoInteractions(lots, documents, movements);
    }

    @Test void draftChecksStockAlreadyReservedByOtherExports() {
        loadLot();
        lot.setReserved(new BigDecimal("7"));
        assertConflict(() -> service.create(warehouse, request(StockDocumentType.EXPORT_SALE, null, null), user));
        assertEquals(new BigDecimal("10"), lot.getQuantity());
        assertEquals(new BigDecimal("7"), lot.getReserved());
        verify(documents, never()).save(any());
        verifyNoInteractions(movements);
    }

    @Test void submitRecordsActorTimeAndNoteWithoutReservingStock() {
        loadDoc(); saveDoc();
        doc.setStatus(StockDocumentStatus.DRAFT);
        Instant before = Instant.now();
        var response = service.transition(warehouse, id, "submit", "Ready for review", user);
        assertEquals(StockDocumentStatus.PENDING_APPROVAL, response.status());
        assertEquals(user.id().toString(), doc.getApproval().get("submitBy"));
        assertEquals("Ready for review", doc.getApproval().get("submitNote"));
        Instant submittedAt = Instant.parse(doc.getApproval().get("submitAt").toString());
        assertFalse(submittedAt.isBefore(before));
        assertFalse(submittedAt.isAfter(Instant.now()));
        verifyNoInteractions(lots, movements);
    }

    @Test void rejectingPendingExportDoesNotChangeInventory() {
        loadDoc(); saveDoc();
        service.transition(warehouse, id, "reject", "Incorrect order", user);
        assertEquals(StockDocumentStatus.CANCELLED, doc.getStatus());
        assertEquals(user.id().toString(), doc.getApproval().get("rejectBy"));
        verifyNoInteractions(lots, movements);
    }

    @Test void completionRejectsMissingReservation() {
        loadDoc(); loadLot();
        doc.setStatus(StockDocumentStatus.APPROVED);
        lot.setReserved(new BigDecimal("3"));
        assertConflict(() -> service.transition(warehouse, id, "complete", null, user));
        assertEquals(new BigDecimal("10"), lot.getQuantity());
        assertEquals(new BigDecimal("3"), lot.getReserved());
        verify(lots, never()).save(any());
        verifyNoInteractions(movements);
    }

    @ParameterizedTest
    @EnumSource(value = StockDocumentStatus.class, names = {"DONE", "CANCELLED"})
    void closedExportsCannotBeCancelled(StockDocumentStatus status) {
        loadDoc(); doc.setStatus(status);
        assertConflict(() -> service.transition(warehouse, id, "cancel", null, user));
        verify(documents, never()).save(any());
        verifyNoInteractions(lots, movements);
    }

    @Test void transferRequiresDestinationProduct() {
        loadLot();
        assertBadRequest(() -> service.create(warehouse,
                request(StockDocumentType.EXPORT_TRANSFER, destination, null), user));
        verifyNoInteractions(products, movements);
        verify(documents, never()).save(any());
    }

    @Test void transferRejectsDifferentUnitEvenWithMatchingSku() {
        loadLot();
        Product target = Product.builder().id(UUID.randomUUID()).warehouseId(destination)
                .sku(source.getSku()).unit("piece").build();
        when(products.findByIdAndWarehouseIdAndDeletedAtIsNull(target.getId(), destination))
                .thenReturn(Optional.of(target));
        assertBadRequest(() -> service.create(warehouse,
                request(StockDocumentType.EXPORT_TRANSFER, destination, target.getId()), user));
        verify(documents, never()).save(any());
        verifyNoInteractions(movements);
    }

    @ParameterizedTest
    @EnumSource(value = StockLotStatus.class, names = {"DAMAGED", "EXPIRED"})
    void transferRejectsUnusableStock(StockLotStatus status) {
        loadLot(); lot.setStatus(status);
        assertConflict(() -> service.create(warehouse,
                request(StockDocumentType.EXPORT_TRANSFER, destination, UUID.randomUUID()), user));
        verifyNoInteractions(products, movements);
        verify(documents, never()).save(any());
    }

    private void assertBadRequest(Runnable action) {
        assertEquals(400, assertThrows(ResponseStatusException.class, action::run).getStatusCode().value());
    }
}

