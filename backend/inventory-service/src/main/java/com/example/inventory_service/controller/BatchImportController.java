package com.example.inventory_service.controller;
import com.example.inventory_service.entity.BatchImport;
import com.example.inventory_service.repository.BatchImportRepository;
import com.example.inventory_service.security.WarehouseAccessService;
import com.example.inventory_service.service.BatchImports;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@RestController @RequestMapping("/warehouses/{warehouse}/batch-imports") @RequiredArgsConstructor
public class BatchImportController {
    private final BatchImports service;
    private final WarehouseAccessService access;
    private final BatchImportRepository imports;
    public record Request(@NotNull UUID requestId,@NotEmpty @Size(max=100) List<@NotNull UUID> batchIds){}
    @GetMapping public List<BatchImport> list(@RequestHeader("Authorization") String auth,@PathVariable UUID warehouse) {
        access.authorize(auth,warehouse,false);return imports.findByWarehouseIdOrderByCreatedAtDesc(warehouse);
    }
    @GetMapping("/reserved") public List<UUID> reserved(@RequestHeader("Authorization") String auth,@PathVariable UUID warehouse) {
        var actor=access.authorizeRoles(auth,warehouse,"COMPANY_ADMIN","WAREHOUSE_MANAGER");
        return service.reserved(actor.companyId());
    }
    @GetMapping("/{id}") public BatchImport get(@RequestHeader("Authorization") String auth,@PathVariable UUID warehouse,@PathVariable UUID id) {
        access.authorize(auth,warehouse,false);return imports.findByIdAndWarehouseId(id,warehouse).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
    }
    @PostMapping public BatchImport create(@RequestHeader("Authorization") String auth,@PathVariable UUID warehouse,@Valid @RequestBody Request r) {
        var actor=access.authorizeRoles(auth,warehouse,"COMPANY_ADMIN","WAREHOUSE_MANAGER");
        var order=service.create(warehouse,r.requestId(),r.batchIds(),actor,auth);
        return !order.isWarehousePayment() && "PROCESSING".equals(order.getStatus())?finish(warehouse,order.getId(),auth,actor.id()):order;
    }
    @PostMapping("/{id}/approve") public BatchImport approve(@RequestHeader("Authorization") String auth,@PathVariable UUID warehouse,@PathVariable UUID id) {
        var actor=access.authorizeRoles(auth,warehouse,"COMPANY_ADMIN");service.prepare(warehouse,id);
        return finish(warehouse,id,auth,actor.id());
    }
    private BatchImport finish(UUID w,UUID id,String auth,UUID actor) {
        var o=service.finish(w,id,auth,actor);
        if("PENDING".equals(o.getStatus()))throw new ResponseStatusException(HttpStatus.CONFLICT,o.getPaymentError()==null?"Số dư chưa đủ tiền hàng và phí 5%.":o.getPaymentError());
        return o;
    }
    @ExceptionHandler(ResponseStatusException.class)
    public ProblemDetail requestError(ResponseStatusException ex) {
        return ex.getBody();
    }

    @PostMapping("/{id}/cancel") public BatchImport cancel(@RequestHeader("Authorization") String auth,@PathVariable UUID warehouse,@PathVariable UUID id) {
        var actor=access.authorizeRoles(auth,warehouse,"COMPANY_ADMIN","WAREHOUSE_MANAGER");return service.cancel(warehouse,id,actor);
    }
}
