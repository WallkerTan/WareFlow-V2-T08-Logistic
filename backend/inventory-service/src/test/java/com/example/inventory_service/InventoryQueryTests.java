package com.example.inventory_service;
import com.example.inventory_service.entity.*;
import com.example.inventory_service.entity.enums.*;
import com.example.inventory_service.repository.*;
import com.example.inventory_service.service.InventoryQueryService;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.domain.Specification;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class InventoryQueryTests {
    StockMovementRepository movements=mock(StockMovementRepository.class);
    ProductRepository products=mock(ProductRepository.class);
    StockLotRepository lots=mock(StockLotRepository.class);
    StockDocumentRepository documents=mock(StockDocumentRepository.class);
    InventoryQueryService query=new InventoryQueryService(movements,products,lots,documents);
    @Test void printEscapesUntrustedSkuAndShowsReceiptQuantity(){
        UUID warehouse=UUID.randomUUID(),id=UUID.randomUUID();
        var doc=StockDocument.builder().id(id).warehouseId(warehouse).type(StockDocumentType.RECEIPT).status(StockDocumentStatus.DONE)
            .lines(List.of(Map.of("sku","<script>alert(1)</script>","lotCode","A&B","receivedQty",new BigDecimal("7")))).build();
        when(documents.findByIdAndWarehouseId(id,warehouse)).thenReturn(Optional.of(doc));
        String html=query.print(warehouse,id);assertFalse(html.contains("<script>"));assertTrue(html.contains("&lt;script&gt;"));assertTrue(html.contains("A&amp;B"));assertTrue(html.contains("<td>7</td>"));
    }
    @Test void lowStockUsesUnreservedUsableStockAndFlagsExpiredBatches(){
        UUID warehouse=UUID.randomUUID();
        var p=Product.builder().id(UUID.randomUUID()).warehouseId(warehouse).sku("SKU").minStock(new BigDecimal("2")).build();
        var usable=StockLot.builder().id(UUID.randomUUID()).product(p).status(StockLotStatus.OK).quantity(BigDecimal.TEN).reserved(new BigDecimal("9")).expiryDate(LocalDate.now().plusDays(5)).build();
        var expired=StockLot.builder().id(UUID.randomUUID()).product(p).status(StockLotStatus.OK).quantity(new BigDecimal("100")).reserved(BigDecimal.ZERO).expiryDate(LocalDate.now().minusDays(1)).build();
        when(products.findAll(any(Specification.class))).thenReturn(List.of(p));when(lots.findByProduct_IdAndDeletedAtIsNull(p.getId())).thenReturn(List.of(usable,expired));
        var alerts=query.alerts(warehouse);assertEquals(Set.of("LOW_STOCK","NEAR_EXPIRY","EXPIRED"),new HashSet<>(alerts.stream().map(InventoryQueryService.Alert::type).toList()));
        assertEquals(0,alerts.stream().filter(a->a.type().equals("LOW_STOCK")).findFirst().orElseThrow().quantity().compareTo(BigDecimal.ONE));
    }
}
