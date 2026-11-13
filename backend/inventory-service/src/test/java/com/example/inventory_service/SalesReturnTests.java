package com.example.inventory_service;

import com.example.inventory_service.service.*;
import com.example.inventory_service.entity.*;
import com.example.inventory_service.entity.enums.*;
import com.example.inventory_service.repository.*;
import com.example.inventory_service.security.WarehouseAccessService.UserIdentity;
import org.junit.jupiter.api.*;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SalesReturnTests {
    DeliveryReturnClient delivery=mock(DeliveryReturnClient.class);
    StockDocumentRepository documents=mock(StockDocumentRepository.class);
    StockLotRepository lots=mock(StockLotRepository.class);
    StockMovementRepository movements=mock(StockMovementRepository.class);
    SalesReturnService service=new SalesReturnService(delivery,documents,lots,movements);
    UUID warehouse=UUID.randomUUID(),shipment=UUID.randomUUID(),saleId=UUID.randomUUID(),lotId=UUID.randomUUID();
    UserIdentity user=new UserIdentity(UUID.randomUUID(),UUID.randomUUID(),"WAREHOUSE_MANAGER");
    StockDocument sale,receipt;StockLot original;
    @BeforeEach void setup(){
        var product=Product.builder().id(UUID.randomUUID()).warehouseId(warehouse).sku("RETURN-SKU").build();
        original=StockLot.builder().id(lotId).product(product).lotCode("ORIGINAL").expiryDate(LocalDate.now().plusDays(20)).quantity(BigDecimal.ZERO).reserved(BigDecimal.ZERO).status(StockLotStatus.OK).build();
        sale=StockDocument.builder().id(saleId).warehouseId(warehouse).type(StockDocumentType.EXPORT_SALE).status(StockDocumentStatus.DONE)
                .lines(List.of(Map.of("lotId",lotId.toString(),"quantity",new BigDecimal("3")))).approval(new HashMap<>()).build();
        when(delivery.requireReturned("Bearer test",warehouse,shipment)).thenReturn(new DeliveryReturnClient.ReturnedShipment(shipment,warehouse,saleId,"RETURNED"));
        when(documents.findByIdAndWarehouseIdForUpdate(saleId,warehouse)).thenReturn(Optional.of(sale));
        when(lots.findForUpdate(lotId,warehouse)).thenReturn(Optional.of(original));
        when(lots.save(any())).thenAnswer(i->{StockLot l=i.getArgument(0);l.setId(UUID.randomUUID());return l;});
        when(documents.saveAndFlush(any())).thenAnswer(i->{receipt=i.getArgument(0);receipt.setId(UUID.randomUUID());return receipt;});
        when(documents.save(any())).thenAnswer(i->i.getArgument(0));
    }
    @Test void returnedGoodsCreateSeparateQuarantineLotAndCannotBeCountedTwice(){
        var first=service.receive("Bearer test",warehouse,shipment,StockLotStatus.DAMAGED,"Inspected",user);
        assertEquals(StockDocumentStatus.DONE,first.status());assertEquals(StockDocumentType.RECEIPT,first.type());
        var lot=org.mockito.ArgumentCaptor.forClass(StockLot.class);verify(lots).save(lot.capture());
        assertEquals(StockLotStatus.DAMAGED,lot.getValue().getStatus());assertEquals(original.getExpiryDate(),lot.getValue().getExpiryDate());
        assertEquals(0,new BigDecimal("3").compareTo(lot.getValue().getQuantity()));assertEquals(BigDecimal.ZERO,original.getQuantity());
        var movement=org.mockito.ArgumentCaptor.forClass(StockMovement.class);verify(movements).save(movement.capture());assertEquals("SALES_RETURN",movement.getValue().getDocumentType());
        when(documents.findByIdAndWarehouseId(first.id(),warehouse)).thenReturn(Optional.of(receipt));
        assertEquals(first.id(),service.receive("Bearer test",warehouse,shipment,StockLotStatus.OK,null,user).id());
        verify(lots,times(1)).save(any());verify(movements,times(1)).save(any());
    }
    @Test void pendingSaleCannotBeRestocked(){
        sale.setStatus(StockDocumentStatus.APPROVED);
        assertEquals(409,assertThrows(ResponseStatusException.class,()->service.receive("Bearer test",warehouse,shipment,StockLotStatus.OK,null,user)).getStatusCode().value());
        verifyNoInteractions(lots,movements);
    }
    @Test void deliveryFailureCannotProduceInventoryChanges(){
        when(delivery.requireReturned("Bearer test",warehouse,shipment)).thenThrow(new ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE));
        assertThrows(ResponseStatusException.class,()->service.receive("Bearer test",warehouse,shipment,StockLotStatus.OK,null,user));
        verifyNoInteractions(documents,lots,movements);
    }
}
