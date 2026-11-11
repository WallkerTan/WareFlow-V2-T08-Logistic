package com.example.delivery_service.controller;

import com.example.delivery_service.dto.*;
import com.example.delivery_service.entity.enums.*;
import com.example.delivery_service.security.WarehouseAccessService;
import com.example.delivery_service.service.ShipmentService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/warehouses/{warehouseId}/shipments")
@RequiredArgsConstructor
public class ShipmentController {
    private final ShipmentService service;
    private final WarehouseAccessService access;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ShipmentResponse create(@RequestHeader(value="Authorization", required=false) String token,
        @PathVariable UUID warehouseId, @Valid @RequestBody ShipmentRequests.Create request) {
        var actor = access.authorize(token, warehouseId, true);
        return service.create(warehouseId, request, actor, token);
    }
    @GetMapping
    public Page<ShipmentResponse> list(@RequestHeader(value="Authorization", required=false) String token,
        @PathVariable UUID warehouseId, @RequestParam(required=false) ShipmentStatus status,
        @RequestParam(required=false) CodStatus codStatus, @RequestParam(required=false) @Size(max=255) String q,
        @RequestParam(defaultValue="0") @Min(0) int page, @RequestParam(defaultValue="20") @Min(1) @Max(100) int size) {
        access.authorize(token, warehouseId, false);
        return service.list(warehouseId, status, codStatus, q,
            PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id")));
    }
    @GetMapping("/{id}")
    public ShipmentResponse get(@RequestHeader(value="Authorization", required=false) String token,
        @PathVariable UUID warehouseId, @PathVariable UUID id) {
        access.authorize(token, warehouseId, false);
        return service.get(warehouseId, id);
    }
    @PatchMapping("/{id}")
    public ShipmentResponse update(@RequestHeader(value="Authorization", required=false) String token,
        @PathVariable UUID warehouseId, @PathVariable UUID id, @Valid @RequestBody ShipmentRequests.Update request) {
        return service.update(warehouseId, id, request, access.authorize(token, warehouseId, true));
    }
    @PatchMapping("/{id}/status")
    public ShipmentResponse status(@RequestHeader(value="Authorization", required=false) String token,
        @PathVariable UUID warehouseId, @PathVariable UUID id, @Valid @RequestBody ShipmentRequests.Status request) {
        return service.transition(warehouseId, id, request, access.authorize(token, warehouseId, true));
    }
    @PostMapping("/{id}/cod/collect")
    public ShipmentResponse collect(@RequestHeader(value="Authorization", required=false) String token,
        @PathVariable UUID warehouseId, @PathVariable UUID id) {
        return service.collect(warehouseId, id, access.authorize(token, warehouseId, true));
    }
}
