package com.example.core_service.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.*;
import org.springframework.transaction.event.TransactionalEventListener;

@Configuration @EnableScheduling @RequiredArgsConstructor @Slf4j
@ConditionalOnProperty(name = "wareflow.finance-sync.enabled", havingValue = "true", matchIfMissing = true)
public class WarehouseFinanceSync {
    private final WarehouseFinanceService finance;
    @TransactionalEventListener
    public void afterCommit(WarehouseFinanceService.ChargeReady event) { deliver(event.id()); }
    @Scheduled(fixedDelayString = "${wareflow.finance-sync.interval-ms:5000}", initialDelayString = "${wareflow.finance-sync.interval-ms:5000}")
    public void retry() { for (var id : finance.pending()) deliver(id); }
    private void deliver(java.util.UUID id) {
        try { finance.deliver(id); }
        catch (RuntimeException error) { log.warn("Warehouse finance event {} remains pending", id); }
    }
}
