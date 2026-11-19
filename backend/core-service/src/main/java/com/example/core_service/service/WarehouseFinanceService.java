package com.example.core_service.service;

import com.example.core_service.client.WarehouseFinanceClient;
import com.example.core_service.entity.WarehouseFinanceEvent;
import com.example.core_service.entity.WarehouseTransaction;
import com.example.core_service.entity.enums.*;
import com.example.core_service.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j
public class WarehouseFinanceService {
    private final WarehouseFinanceEventRepository events;
    private final WarehouseTransactionRepository transactions;
    private final WarehouseFinanceClient client;
    private final ApplicationEventPublisher publisher;
    public record ChargeReady(UUID id) { }

    @Transactional
    public void enqueue(WarehouseTransaction transaction) {
        events.save(WarehouseFinanceEvent.from(transaction));
        publisher.publishEvent(new ChargeReady(transaction.getId()));
    }

    @Transactional
    public List<UUID> pending() {
        // Recover completed transactions from before accounting synchronization existed.
        for (var transaction : transactions.findUnrecorded(WarehouseTransactionStatus.COMPLETED, WarehouseTransactionType.RETURN, PageRequest.of(0, 50))) {
            var event = WarehouseFinanceEvent.from(transaction);
            if (event.getAmount() != null && event.getAmount().signum() > 0) events.save(event);
        }
        return events.pending(Instant.now(), PageRequest.of(0, 50));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void deliver(UUID id) {
        var event = events.findForUpdate(id).orElse(null);
        if (event == null || event.getDeliveredAt() != null) return;
        try {
            client.record(event);
            event.setDeliveredAt(Instant.now());
        } catch (org.springframework.web.client.RestClientException error) {
            event.setAttempts(event.getAttempts() + 1);
            event.setRetryAt(Instant.now().plusSeconds(Math.min(300, 5L << Math.min(event.getAttempts(), 6))));
            log.warn("Warehouse finance event {} retained for retry (attempt {})", id, event.getAttempts());
        }
    }
}
