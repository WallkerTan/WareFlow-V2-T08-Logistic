package com.example.inventory_service;
import com.example.inventory_service.service.*;
import com.example.inventory_service.service.TradeService.*;
import com.example.inventory_service.repository.*;
import com.example.inventory_service.security.WarehouseAccessService.UserIdentity;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@DataJpaTest(properties={"spring.cloud.config.enabled=false","spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.datasource.url=jdbc:h2:mem:trade;MODE=PostgreSQL;DB_CLOSE_DELAY=-1","spring.datasource.driver-class-name=org.h2.Driver",
    "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"})
@AutoConfigureTestDatabase(replace=AutoConfigureTestDatabase.Replace.NONE)
@Import(TradeService.class) @Transactional(propagation=Propagation.NOT_SUPPORTED)
class TradePersistenceTests {
    @Autowired TradeService service;
    @Autowired TradeOperationRepository operations;
    @Autowired ProductRepository products;
    @Autowired StockLotRepository lots;
    @MockitoBean TradeClient client;
    final UUID company=UUID.randomUUID(),warehouse=UUID.randomUUID(),supplier=UUID.randomUUID(),catalogProduct=UUID.randomUUID();
    final UserIdentity admin=new UserIdentity(UUID.randomUUID(),company,"COMPANY_ADMIN"),manager=new UserIdentity(UUID.randomUUID(),company,"WAREHOUSE_MANAGER");
    @BeforeEach void catalog(){when(client.catalog(supplier,"auth")).thenReturn(List.of(Map.of("id",catalogProduct.toString(),"sku","SK1-01","name","Product","unit","box","price",new BigDecimal("1000000"))));}
    UUID batch(){return service.createBatch(new BatchRequest(List.of(new BatchLine(supplier,catalogProduct,new BigDecimal("10"),BigDecimal.ONE))),admin,"auth").getId();}
    UUID imported(){var id=UUID.randomUUID();service.createImport(warehouse,new ImportRequest(id,List.of(batch())),admin);service.settle(id);return lots.findByProduct_IdAndDeletedAtIsNull(products.findByWarehouseIdAndSkuIgnoreCaseAndDeletedAtIsNull(warehouse,"SK1-01").orElseThrow().getId()).getFirst().getId();}
    OutRequest out(UUID lot,String kind,String qty,UUID target){return new OutRequest(UUID.randomUUID(),kind,target,List.of(new OutLine(lot,new BigDecimal(qty),new BigDecimal("100"))),"Receiver","Address","0900000000","Note");}
    @Test void managerImportWaitsForApprovalAndReceiptIsIdempotent(){
        var id=UUID.randomUUID();var batch=batch();
        assertEquals("PENDING_APPROVAL",service.createImport(warehouse,new ImportRequest(id,List.of(batch)),manager).getStatus());
        service.settle(id);verify(client,never()).settle(any());
        assertThrows(ResponseStatusException.class,()->service.action(warehouse,id,"approve",manager));
        service.action(warehouse,id,"approve",admin);service.settle(id);service.settle(id);
        verify(client,times(1)).settle(any());
        var product=products.findByWarehouseIdAndSkuIgnoreCaseAndDeletedAtIsNull(warehouse,"SK1-01").orElseThrow();assertEquals(0,new BigDecimal("10").compareTo(lots.sumQuantity(product.getId())));
    }
    @Test void failedPaymentLeavesNoStockAndCanRetry(){
        var id=UUID.randomUUID();service.createImport(warehouse,new ImportRequest(id,List.of(batch())),admin);
        doThrow(new org.springframework.web.client.ResourceAccessException("offline")).when(client).settle(any());
        assertThrows(org.springframework.web.client.ResourceAccessException.class,()->service.settle(id));
        assertEquals("PAYMENT_PENDING",operations.findById(id).orElseThrow().getStatus());assertTrue(products.findByWarehouseIdAndSkuIgnoreCaseAndDeletedAtIsNull(warehouse,"SK1-01").isEmpty());
        doNothing().when(client).settle(any());assertEquals("DONE",service.settle(id).getStatus());
    }
    @Test void concurrentImportRetriesDoNotDuplicateStock() throws Exception {
        var id=UUID.randomUUID();service.createImport(warehouse,new ImportRequest(id,List.of(batch())),admin);
        try(var executor=java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var start=new java.util.concurrent.CountDownLatch(1);
            var first=executor.submit(()->{start.await();return service.settle(id).getStatus();});
            var second=executor.submit(()->{start.await();return service.settle(id).getStatus();});start.countDown();
            assertEquals("DONE",first.get(10,java.util.concurrent.TimeUnit.SECONDS));assertEquals("DONE",second.get(10,java.util.concurrent.TimeUnit.SECONDS));
        }
        var product=products.findByWarehouseIdAndSkuIgnoreCaseAndDeletedAtIsNull(warehouse,"SK1-01").orElseThrow();
        assertEquals(0,new BigDecimal("10").compareTo(lots.sumQuantity(product.getId())));verify(client,times(1)).settle(any());
    }
    @Test void salesReserveStockAndCannotOversellOrChangeRetryPayload(){
        UUID lot=imported();var request=out(lot,"SALE","6",null);var sale=service.createOutbound(warehouse,request,manager);
        service.createOutbound(warehouse,request,manager);
        assertThrows(ResponseStatusException.class,()->service.createOutbound(warehouse,out(lot,"SALE","5",null),manager));
        var changed=new OutRequest(request.id(),"SALE",null,List.of(new OutLine(lot,BigDecimal.ONE,BigDecimal.ZERO)),"Other","Address","090","Note");
        assertThrows(ResponseStatusException.class,()->service.createOutbound(warehouse,changed,manager));
        service.action(warehouse,sale.getId(),"complete",manager);service.settle(sale.getId());service.settle(sale.getId());
        assertEquals(0,new BigDecimal("4").compareTo(lots.findById(lot).orElseThrow().getQuantity()));
    }
    @Test void transferCreatesDestinationAndMergesExistingStock(){
        UUID lot=imported(),target=UUID.randomUUID();service.createOutbound(warehouse,out(lot,"TRANSFER","3",target),admin);service.createOutbound(warehouse,out(lot,"TRANSFER","2",target),admin);
        var product=products.findByWarehouseIdAndSkuIgnoreCaseAndDeletedAtIsNull(target,"SK1-01").orElseThrow();
        assertEquals(1,lots.findByProduct_IdAndDeletedAtIsNull(product.getId()).size());assertEquals(0,new BigDecimal("5").compareTo(lots.sumQuantity(product.getId())));
    }
    @Test void returnRequiresWholeBatchAndTenMillion(){
        UUID lot=imported();assertThrows(ResponseStatusException.class,()->service.createOutbound(warehouse,out(lot,"RETURN","9",null),admin));
        var op=service.createOutbound(warehouse,out(lot,"RETURN","10",null),admin);service.settle(op.getId());assertEquals(0,lots.findById(lot).orElseThrow().getQuantity().signum());
    }
}
