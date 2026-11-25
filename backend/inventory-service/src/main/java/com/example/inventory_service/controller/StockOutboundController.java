package com.example.inventory_service.controller;

import com.example.inventory_service.dto.*;
import com.example.inventory_service.entity.enums.*;
import com.example.inventory_service.security.WarehouseAccessService;
import com.example.inventory_service.service.StockOutboundService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/warehouses/{warehouseId}/exports")
@RequiredArgsConstructor
public class StockOutboundController {
    private final StockOutboundService outbound;
    private final WarehouseAccessService access;

    @org.springframework.beans.factory.annotation.Value("${FINANCE_SERVICE_URL:http://localhost:8083}") private String financeUrl;
    @org.springframework.beans.factory.annotation.Value("${DELIVERY_SERVICE_URL:http://localhost:8084}") private String deliveryUrl;
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StockDocumentResponse create(@RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable UUID warehouseId, @Valid @RequestBody CreateExportRequest request) {
        var user = access.authorizeRoles(authorization, warehouseId, "WAREHOUSE_MANAGER", "COMPANY_ADMIN");
        if (request.targetWarehouseId() != null) access.verifyDestination(authorization,warehouseId, request.targetWarehouseId());
        return outbound.create(warehouseId, request, user);
    }

    @PutMapping("/{id}")
    public StockDocumentResponse updateSaleDraft(@RequestHeader("Authorization") String authorization,
            @PathVariable UUID warehouseId, @PathVariable UUID id, @Valid @RequestBody CreateExportRequest request) {
        access.authorizeRoles(authorization, warehouseId, "WAREHOUSE_MANAGER", "COMPANY_ADMIN");
        return outbound.updateSaleDraft(warehouseId, id, request);
    }

    @GetMapping
    public Page<StockDocumentResponse> list(@RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable UUID warehouseId, @RequestParam(required = false) StockDocumentType type,
            @RequestParam(required = false) StockDocumentStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        access.authorizeRoles(authorization, warehouseId, "WAREHOUSE_MANAGER", "COMPANY_ADMIN", "SYSTEM_ADMIN");
        return outbound.list(warehouseId, type, status, pageable);
    }

    @GetMapping("/{id}")
    public StockDocumentResponse get(@RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable UUID warehouseId, @PathVariable UUID id) {
        access.authorizeRoles(authorization, warehouseId, "WAREHOUSE_MANAGER", "COMPANY_ADMIN", "SYSTEM_ADMIN");
        return outbound.get(warehouseId, id);
    }

    @PostMapping("/{id}/{action:submit|approve|reject|cancel|complete}")
    public StockDocumentResponse transition(@RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable UUID warehouseId, @PathVariable UUID id, @PathVariable String action,
            @RequestBody(required = false) ApprovalDecisionRequest request) {
        boolean approval = action.equals("approve") || action.equals("reject");
        var user = approval
                ? access.authorizeRoles(authorization, warehouseId, "COMPANY_ADMIN", "SYSTEM_ADMIN")
                : access.authorizeRoles(authorization, warehouseId, "WAREHOUSE_MANAGER", "COMPANY_ADMIN");
        var doc = outbound.get(warehouseId, id);
        if (doc.targetWarehouseId() != null && (action.equals("approve") || action.equals("complete")))
            access.verifyDestination(authorization,warehouseId, doc.targetWarehouseId());
        var result=outbound.transition(warehouseId,id,action,request==null?null:request.note(),user);
        if(action.equals("complete") && result.approval().get("total")!=null){
            if(result.type()==StockDocumentType.EXPORT_RETURN) {
                org.springframework.web.client.RestClient.create(financeUrl).post()
                    .uri("/wallets/settle/RETURN/{w}/{id}",warehouseId,id).header("Authorization",authorization).retrieve().toBodilessEntity();
            } else if(result.type()==StockDocumentType.EXPORT_SALE) {
                org.springframework.web.client.RestClient.create(deliveryUrl).post().uri("/warehouses/{w}/shipments",warehouseId)
                    .header("Authorization",authorization).body(java.util.Map.of("documentId",id,"carrier","WareFlow","trackingCode","WF-"+id))
                    .retrieve().toBodilessEntity();
            }
        }
        return result;
    }
    @ExceptionHandler(ResponseStatusException.class)
    public ProblemDetail requestError(ResponseStatusException error) {
        return error.getBody();
    }

}
