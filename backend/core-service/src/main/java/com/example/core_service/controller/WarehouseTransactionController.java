package com.example.core_service.controller;

import com.example.core_service.dto.request.CreateWarehouseTransactionRequest;
import com.example.core_service.dto.request.NegotiateWarehouseTransactionRequest;
import com.example.core_service.dto.response.WarehouseTransactionResponse;
import com.example.core_service.entity.enums.WarehouseTransactionStatus;
import com.example.core_service.service.WarehouseTransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/warehouse-transactions")
@RequiredArgsConstructor
public class WarehouseTransactionController {

    private final WarehouseTransactionService transactionService;

    @PostMapping
    @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'WAREHOUSE_MANAGER')")
    public WarehouseTransactionResponse create(@Valid @RequestBody CreateWarehouseTransactionRequest request) {
        return transactionService.create(request);
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public Page<WarehouseTransactionResponse> list(
            @RequestParam(required = false) WarehouseTransactionStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return transactionService.list(status, pageable);
    }

    @PostMapping("/{id}/negotiations")
    @PreAuthorize("isAuthenticated()")
    public WarehouseTransactionResponse negotiate(
            @PathVariable UUID id,
            @Valid @RequestBody NegotiateWarehouseTransactionRequest request
    ) {
        return transactionService.negotiate(id, request);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'COMPANY_ADMIN')")
    public WarehouseTransactionResponse approve(@PathVariable UUID id) {
        return transactionService.approve(id);
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'COMPANY_ADMIN')")
    public WarehouseTransactionResponse reject(
            @PathVariable UUID id,
            @RequestParam(required = false) String reason
    ) {
        return transactionService.reject(id, reason);
    }
}
