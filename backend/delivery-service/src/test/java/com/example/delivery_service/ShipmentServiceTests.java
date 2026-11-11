package com.example.delivery_service;

import com.example.delivery_service.client.InventoryClient;
import com.example.delivery_service.config.ShipmentDataInitializer;
import com.example.delivery_service.entity.Shipment;
import com.example.delivery_service.dto.*;
import com.example.delivery_service.entity.enums.*;
import com.example.delivery_service.repository.ShipmentRepository;
import com.example.delivery_service.service.ShipmentService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import java.math.BigDecimal;
import java.util.UUID;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest
class ShipmentServiceTests {
    @Autowired ShipmentService service;
    @Autowired ShipmentRepository repository;
    @Autowired ShipmentDataInitializer initializer;
    @MockitoBean InventoryClient inventory;
    final UUID warehouse = UUID.randomUUID(), actor = UUID.randomUUID();
    @BeforeEach void clear() { repository.deleteAll(); }
    ShipmentResponse create(BigDecimal amount) {
        return service.create(warehouse, new ShipmentRequests.Create(UUID.randomUUID(), "GHN", UUID.randomUUID().toString(), amount), actor, "token");
    }
    void move(UUID id, ShipmentStatus status) {
        service.transition(warehouse, id, new ShipmentRequests.Status(status, "note", "HCM"), actor);
    }
    @Test void lifecycleAndCodArePersistedAndIdempotent() {
        var s = create(new BigDecimal("150000"));
        assertEquals(CodStatus.PENDING, s.codStatus());
        assertThrows(ResponseStatusException.class, () -> service.collect(warehouse,s.id(),actor));
        move(s.id(), ShipmentStatus.IN_TRANSIT);
        move(s.id(), ShipmentStatus.DELIVERED);
        var collected = service.collect(warehouse,s.id(),actor);
        assertEquals(CodStatus.COLLECTED,collected.codStatus());
        assertEquals(actor,collected.collectedBy());
        assertNotNull(collected.collectedAt());
        assertEquals(4,collected.history().size());
        assertEquals(4,service.collect(warehouse,s.id(),actor).history().size());
        assertEquals(CodStatus.COLLECTED,service.get(warehouse,s.id()).codStatus());
    }
    @Test void tenantIsolationAndFilters() {
        var s = create(BigDecimal.TEN);
        assertEquals(404,assertThrows(ResponseStatusException.class,
            () -> service.get(UUID.randomUUID(),s.id())).getStatusCode().value());
        assertThrows(ResponseStatusException.class, () -> service.collect(UUID.randomUUID(),s.id(),actor));
        assertEquals(0,service.list(UUID.randomUUID(),null,null,null,PageRequest.of(0,20)).getTotalElements());
        assertEquals(1,service.list(warehouse,ShipmentStatus.CREATED,CodStatus.PENDING,s.trackingCode(),PageRequest.of(0,20)).getTotalElements());
        assertEquals(0,service.list(warehouse,null,CodStatus.COLLECTED,null,PageRequest.of(0,20)).getTotalElements());
    }
    @Test void rejectInvalidTransitionsAndAllowRetryOrReturn() {
        var s = create(BigDecimal.ZERO);
        assertEquals(CodStatus.NOT_REQUIRED,s.codStatus());
        assertThrows(ResponseStatusException.class, () -> move(s.id(),ShipmentStatus.DELIVERED));
        move(s.id(),ShipmentStatus.IN_TRANSIT);
        assertThrows(ResponseStatusException.class, () -> service.update(warehouse,s.id(),new ShipmentRequests.Update(null,null,BigDecimal.TEN),actor));
        move(s.id(),ShipmentStatus.FAILED);
        move(s.id(),ShipmentStatus.IN_TRANSIT);
        move(s.id(),ShipmentStatus.FAILED);
        move(s.id(),ShipmentStatus.RETURNED);
        assertThrows(ResponseStatusException.class, () -> move(s.id(),ShipmentStatus.IN_TRANSIT));
        assertEquals(6, service.get(warehouse,s.id()).history().size());
    }
    @Test void duplicateDocumentAndTrackingRejectedByDatabase() {
        var s=create(BigDecimal.ZERO);
        assertThrows(DataIntegrityViolationException.class, () -> service.create(warehouse,
            new ShipmentRequests.Create(s.documentId(),"OTHER","new",BigDecimal.ZERO),actor,"token"));
        assertThrows(DataIntegrityViolationException.class, () -> service.create(warehouse,
            new ShipmentRequests.Create(UUID.randomUUID(),s.carrier(),s.trackingCode(),BigDecimal.ZERO),actor,"token"));
    }
    @Test void zeroCodCannotBeCollectedAndAmountCanChangeBeforeDispatch() {
        var s=create(null);
        var updated=service.update(warehouse,s.id(),new ShipmentRequests.Update(" GHN "," NEW ",BigDecimal.TEN),actor);
        assertEquals("NEW",updated.trackingCode());
        assertEquals(CodStatus.PENDING,updated.codStatus());
        service.update(warehouse,s.id(),new ShipmentRequests.Update(null,null,BigDecimal.ZERO),actor);
        move(s.id(),ShipmentStatus.IN_TRANSIT); move(s.id(),ShipmentStatus.DELIVERED);
        assertThrows(ResponseStatusException.class, () -> service.collect(warehouse,s.id(),actor));
    }
    @Test void concurrentCollectionAddsOnlyOneEvent() throws Exception {
        var s=create(BigDecimal.TEN);
        move(s.id(),ShipmentStatus.IN_TRANSIT); move(s.id(),ShipmentStatus.DELIVERED);
        try (var executor=Executors.newFixedThreadPool(2)) {
            var gate=new CountDownLatch(1);
            Callable<ShipmentResponse> call=() -> { gate.await(); return service.collect(warehouse,s.id(),actor); };
            var first=executor.submit(call); var second=executor.submit(call); gate.countDown();
            assertEquals(CodStatus.COLLECTED,first.get(10,TimeUnit.SECONDS).codStatus());
            assertEquals(CodStatus.COLLECTED,second.get(10,TimeUnit.SECONDS).codStatus());
        }
        assertEquals(4,service.get(warehouse,s.id()).history().size());
    }
    @Test void failedInventoryValidationDoesNotCreateShipment() {
        doThrow(new ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT)).when(inventory)
            .requireCompletedSale(anyString(),any(),any());
        assertThrows(ResponseStatusException.class, () -> create(BigDecimal.TEN));
        assertEquals(0,repository.count());
    }
    @Test void legacyCodBackfillIsIdempotentAndPreservesCollections() {
        var collected=create(BigDecimal.TEN);
        move(collected.id(),ShipmentStatus.IN_TRANSIT); move(collected.id(),ShipmentStatus.DELIVERED);
        service.collect(warehouse,collected.id(),actor);
        var zero=repository.saveAndFlush(Shipment.builder().warehouseId(warehouse).documentId(UUID.randomUUID())
            .carrier("OLD").trackingCode("ZERO").codAmount(null).build());
        var pending=repository.saveAndFlush(Shipment.builder().warehouseId(warehouse).documentId(UUID.randomUUID())
            .carrier("OLD").trackingCode("PENDING").codAmount(BigDecimal.TEN).build());
        initializer.run(null); initializer.run(null);
        assertEquals(CodStatus.NOT_REQUIRED,service.get(warehouse,zero.getId()).codStatus());
        assertEquals(0,service.get(warehouse,zero.getId()).codAmount().signum());
        assertEquals(CodStatus.PENDING,service.get(warehouse,pending.getId()).codStatus());
        assertEquals(CodStatus.COLLECTED,service.get(warehouse,collected.id()).codStatus());
    }
}
