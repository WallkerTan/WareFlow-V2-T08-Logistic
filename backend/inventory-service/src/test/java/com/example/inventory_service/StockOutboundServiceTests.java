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
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StockOutboundServiceTests {
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

    @Test void createsDraftWithoutChangingStock() {
        loadLot(); saveDoc();
        var result = service.create(warehouse, request(StockDocumentType.EXPORT_SALE, null, null), user);
        assertEquals(StockDocumentStatus.DRAFT, result.status());
        assertEquals(BigDecimal.ZERO, lot.getReserved());
        verify(lots, never()).save(any()); verifyNoInteractions(movements);
    }
    @Test void rejectsDuplicateLots() {
        loadLot();
        var line = new CreateExportRequest.Line(lot.getId(), BigDecimal.ONE, null);
        assertThrows(ResponseStatusException.class, () -> service.create(warehouse,
                new CreateExportRequest(StockDocumentType.EXPORT_SALE, null, List.of(line, line), null), user));
        verify(documents, never()).save(any());
    }
    @Test void rejectsWrongWarehouseLot() {
        when(lots.findForUpdate(lot.getId(), warehouse)).thenReturn(Optional.empty());
        assertEquals(404, assertThrows(ResponseStatusException.class, () -> service.create(warehouse,
                request(StockDocumentType.EXPORT_SALE, null, null), user)).getStatusCode().value());
    }
    @Test void rejectsTransferToSameWarehouse() {
        assertThrows(ResponseStatusException.class, () -> service.create(warehouse,
                request(StockDocumentType.EXPORT_TRANSFER, warehouse, source.getId()), user));
        verifyNoInteractions(lots);
    }
    @Test void rejectsMismatchedDestinationSku() {
        loadLot();
        Product target = Product.builder().id(UUID.randomUUID()).warehouseId(destination).sku("OTHER").unit("box").build();
        when(products.findByIdAndWarehouseIdAndDeletedAtIsNull(target.getId(), destination)).thenReturn(Optional.of(target));
        assertThrows(ResponseStatusException.class, () -> service.create(warehouse,
                request(StockDocumentType.EXPORT_TRANSFER, destination, target.getId()), user));
        verify(documents, never()).save(any());
    }
    @Test void approvalReservesWithoutDeductingStock() {
        loadDoc(); loadLot(); saveDoc();
        service.transition(warehouse, id, "approve", null, user);
        assertEquals(new BigDecimal("4"), lot.getReserved());
        assertEquals(new BigDecimal("10"), lot.getQuantity());
        assertEquals(StockDocumentStatus.APPROVED, doc.getStatus());
        verifyNoInteractions(movements);
    }
    @Test void approvalRechecksAvailableStock() {
        loadDoc(); loadLot(); lot.setReserved(new BigDecimal("7"));
        assertConflict(() -> service.transition(warehouse, id, "approve", null, user));
        verify(lots, never()).save(any());
    }
    @Test void cannotCompleteWithoutApproval() {
        loadDoc();
        assertConflict(() -> service.transition(warehouse, id, "complete", null, user));
        verifyNoInteractions(lots, movements);
    }
    @Test void completionDeductsAndReleasesOnlyItsReservation() {
        loadDoc(); loadLot(); saveDoc(); doc.setStatus(StockDocumentStatus.APPROVED);
        lot.setReserved(new BigDecimal("6"));
        service.transition(warehouse, id, "pick", null, user);
        service.transition(warehouse, id, "pack", null, user);
        service.transition(warehouse, id, "complete", null, user);
        assertEquals(new BigDecimal("6"), lot.getQuantity());
        assertEquals(new BigDecimal("2"), lot.getReserved());
        verify(movements).save(argThat(m -> m.getQtyChange().equals(new BigDecimal("-4")) && m.getWarehouseId().equals(warehouse)));
    }
    @Test void repeatedCompletionDoesNotDeductAgain() {
        loadDoc(); doc.setStatus(StockDocumentStatus.DONE);
        assertEquals(StockDocumentStatus.DONE, service.transition(warehouse, id, "complete", null, user).status());
        verifyNoInteractions(lots, movements);
    }
    @Test void cannotPackBeforePickingOrCompleteBeforePacking() {
        loadDoc(); doc.setStatus(StockDocumentStatus.APPROVED);
        assertConflict(() -> service.transition(warehouse,id,"pack",null,user));
        assertConflict(() -> service.transition(warehouse,id,"complete",null,user));
        verifyNoInteractions(lots,movements);
    }
    @Test void cancellationReleasesReservationEvenWhenLotHasExpired() {
        loadDoc(); loadLot(); saveDoc(); doc.setStatus(StockDocumentStatus.APPROVED);
        lot.setReserved(new BigDecimal("4")); lot.setStatus(StockLotStatus.EXPIRED);
        service.transition(warehouse, id, "cancel", "cancelled", user);
        assertEquals(BigDecimal.ZERO, lot.getReserved());
        assertEquals(new BigDecimal("10"), lot.getQuantity());
        assertEquals(StockDocumentStatus.CANCELLED, doc.getStatus());
        verifyNoInteractions(movements);
    }
    @Test void rejectsExpiredStockEvenWhenStatusIsOk() {
        loadDoc(); loadLot(); lot.setExpiryDate(LocalDate.now().minusDays(1));
        assertConflict(() -> service.transition(warehouse, id, "approve", null, user));
    }
    @Test void allowsDestructionOfDamagedStock() {
        loadDoc(); loadLot(); saveDoc(); lot.setStatus(StockLotStatus.DAMAGED);
        doc.setType(StockDocumentType.EXPORT_DESTROY);
        service.transition(warehouse, id, "approve", null, user);
        assertEquals(new BigDecimal("4"), lot.getReserved());
    }
    @Test void transferPreservesQuantityExpiryAndAuditInBothWarehouses() {
        loadDoc(); loadLot(); saveDoc();
        doc.setType(StockDocumentType.EXPORT_TRANSFER); doc.setTargetWarehouseId(destination);
        doc.setStatus(StockDocumentStatus.APPROVED); lot.setReserved(new BigDecimal("4"));
        lot.setExpiryDate(LocalDate.now().plusDays(30));
        Product target = Product.builder().id(UUID.randomUUID()).warehouseId(destination).sku("SKU-1").unit("box").build();
        doc.getLines().getFirst().put("targetProductId", target.getId().toString());
        when(products.findByIdAndWarehouseIdAndDeletedAtIsNull(target.getId(), destination)).thenReturn(Optional.of(target));
        when(lots.save(any())).thenAnswer(i -> { StockLot saved = i.getArgument(0); if (saved.getId() == null) saved.setId(UUID.randomUUID()); return saved; });
        service.transition(warehouse, id, "complete", null, user);
        assertEquals(new BigDecimal("6"), lot.getQuantity());
        verify(lots).save(argThat(l -> l.getProduct() == target && l.getQuantity().equals(new BigDecimal("4"))
                && l.getExpiryDate().equals(lot.getExpiryDate()) && l.getReserved().signum() == 0));
        verify(movements).save(argThat(m -> m.getWarehouseId().equals(destination) && m.getQtyChange().equals(new BigDecimal("4"))));
        verify(movements).save(argThat(m -> m.getWarehouseId().equals(warehouse) && m.getQtyChange().equals(new BigDecimal("-4"))));
        assertNotNull(doc.getLines().getFirst().get("targetLotId"));
    }
}
