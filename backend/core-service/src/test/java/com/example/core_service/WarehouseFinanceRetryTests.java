package com.example.core_service;

import com.example.core_service.client.WarehouseFinanceClient;
import com.example.core_service.entity.*;
import com.example.core_service.entity.enums.*;
import com.example.core_service.repository.*;
import com.example.core_service.service.WarehouseFinanceService;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.web.client.ResourceAccessException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class WarehouseFinanceRetryTests {
    WarehouseFinanceEventRepository events = mock(WarehouseFinanceEventRepository.class);
    WarehouseTransactionRepository transactions = mock(WarehouseTransactionRepository.class);
    WarehouseFinanceClient client = mock(WarehouseFinanceClient.class);
    WarehouseFinanceService service = new WarehouseFinanceService(events, transactions, client, mock(ApplicationEventPublisher.class));
    WarehouseTransaction transaction() {
        return WarehouseTransaction.builder().id(UUID.randomUUID()).company(Company.builder().id(UUID.randomUUID()).build())
                .warehouse(Warehouse.builder().id(UUID.randomUUID()).price(BigDecimal.TEN).build()).type(WarehouseTransactionType.RENT)
                .status(WarehouseTransactionStatus.COMPLETED).createdAt(Instant.parse("2025-01-02T03:00:00Z")).build();
    }
    @Test void failedDeliveryIsRetainedAndSuccessfulRetryIsNotSentAgain() {
        var event = WarehouseFinanceEvent.from(transaction());
        when(events.findForUpdate(event.getId())).thenReturn(Optional.of(event));
        doThrow(new ResourceAccessException("offline")).doNothing().when(client).record(event);
        service.deliver(event.getId());
        assertNull(event.getDeliveredAt()); assertEquals(1, event.getAttempts()); assertTrue(event.getRetryAt().isAfter(Instant.now()));
        service.deliver(event.getId()); assertNotNull(event.getDeliveredAt());
        service.deliver(event.getId()); verify(client, times(2)).record(event);
    }
    @Test void historicalCompletedTransactionsKeepOriginalDateAndListedPriceFallback() {
        var old = transaction();
        when(transactions.findUnrecorded(eq(WarehouseTransactionStatus.COMPLETED), eq(WarehouseTransactionType.RETURN), any())).thenReturn(List.of(old));
        when(events.pending(any(), any())).thenReturn(List.of(old.getId()));
        assertEquals(List.of(old.getId()), service.pending());
        verify(events).save(argThat(event -> event.getOccurredAt().equals(old.getCreatedAt()) && event.getAmount().compareTo(BigDecimal.TEN) == 0));
    }
}
