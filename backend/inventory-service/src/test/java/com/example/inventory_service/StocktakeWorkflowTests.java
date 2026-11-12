package com.example.inventory_service;
import com.example.inventory_service.entity.*;
import com.example.inventory_service.entity.enums.*;
import com.example.inventory_service.repository.*;
import com.example.inventory_service.service.StocktakeAdjustmentService;
import com.example.inventory_service.security.WarehouseAccessService.UserIdentity;
import org.junit.jupiter.api.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class StocktakeWorkflowTests {
    StockDocumentRepository docs=mock(StockDocumentRepository.class);
    StockLotRepository lots=mock(StockLotRepository.class);
    ProductRepository products=mock(ProductRepository.class);
    StockMovementRepository movements=mock(StockMovementRepository.class);
    StocktakeAdjustmentService service=new StocktakeAdjustmentService(docs,lots,products,movements);
    UUID warehouse=UUID.randomUUID(),lotId=UUID.randomUUID(),id=UUID.randomUUID();
    UserIdentity actor=new UserIdentity(UUID.randomUUID(),UUID.randomUUID(),"COMPANY_ADMIN");
    StockDocument stocktake;StockLot lot;
    @BeforeEach void setup(){
        Product p=Product.builder().id(UUID.randomUUID()).warehouseId(warehouse).sku("SKU").build();
        lot=StockLot.builder().id(lotId).product(p).lotCode("LOT").quantity(BigDecimal.TEN).reserved(BigDecimal.ZERO).build();
        stocktake=StockDocument.builder().id(id).warehouseId(warehouse).type(StockDocumentType.STOCKTAKE).status(StockDocumentStatus.APPROVED)
            .lines(List.of(Map.of("lotId",lotId.toString(),"productId",p.getId().toString(),"systemQuantity",BigDecimal.TEN,"countedQuantity",new BigDecimal("8"),"variance",new BigDecimal("-2"))))
            .approval(new HashMap<>()).build();
        when(docs.findByIdAndWarehouseIdForUpdate(id,warehouse)).thenReturn(Optional.of(stocktake));
        when(lots.findForUpdate(lotId,warehouse)).thenReturn(Optional.of(lot));
        when(docs.save(any())).thenAnswer(i->{StockDocument d=i.getArgument(0);if(d.getId()==null)d.setId(UUID.randomUUID());return d;});
    }
    @Test void completedCountCreatesPendingAdjustmentWithoutChangingStock(){
        var result=service.transition(warehouse,id,StockDocumentType.STOCKTAKE,"complete",null,actor);
        assertEquals(StockDocumentStatus.DONE,result.status());assertNotNull(result.approval().get("adjustmentId"));
        verify(docs).save(argThat(d->d.getType()==StockDocumentType.ADJUST&&d.getStatus()==StockDocumentStatus.PENDING_APPROVAL&&new BigDecimal(d.getLines().getFirst().get("delta").toString()).compareTo(new BigDecimal("-2"))==0));
        assertEquals(BigDecimal.TEN,lot.getQuantity());verifyNoInteractions(movements);
        service.transition(warehouse,id,StockDocumentType.STOCKTAKE,"complete",null,actor);
        verify(docs,times(1)).save(argThat(d->d.getType()==StockDocumentType.ADJUST));
    }
    @Test void staleCountCannotCreateAdjustment(){
        lot.setQuantity(new BigDecimal("11"));
        assertEquals(409,assertThrows(ResponseStatusException.class,()->service.transition(warehouse,id,StockDocumentType.STOCKTAKE,"complete",null,actor)).getStatusCode().value());
        verify(docs,never()).save(any());
    }
    @Test void adjustmentCannotConsumeReservedStock(){
        stocktake.setType(StockDocumentType.ADJUST);stocktake.setLines(List.of(Map.of("lotId",lotId.toString(),"delta",new BigDecimal("-2"))));lot.setReserved(new BigDecimal("9"));
        assertEquals(409,assertThrows(ResponseStatusException.class,()->service.transition(warehouse,id,StockDocumentType.ADJUST,"complete",null,actor)).getStatusCode().value());verifyNoInteractions(movements);
    }
}
