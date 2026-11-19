package com.example.finance_service.controller;

import com.example.finance_service.dto.WarehouseChargeRequest;
import com.example.finance_service.security.FinanceAccessService;
import com.example.finance_service.service.WarehouseChargeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController @RequiredArgsConstructor
@RequestMapping("/internal/warehouse-charges")
public class WarehouseChargeController {
    private final WarehouseChargeService charges;
    private final FinanceAccessService access;
    @PostMapping @ResponseStatus(HttpStatus.NO_CONTENT)
    public void record(@RequestHeader(value = "Authorization", required = false) String authorization,
                       @Valid @RequestBody WarehouseChargeRequest request) {
        access.authenticateCoreService(authorization);
        charges.record(request);
    }
}
