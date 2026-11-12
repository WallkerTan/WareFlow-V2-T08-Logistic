package com.example.inventory_service.controller;
import com.example.inventory_service.security.WarehouseAccessService;
import com.example.inventory_service.service.InventoryQueryService;
import com.example.inventory_service.service.InventoryQueryService.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.*;
@RestController @RequiredArgsConstructor @RequestMapping("/warehouses/{warehouseId}")
public class InventoryQueryController {
    private final WarehouseAccessService access;
    private final InventoryQueryService query;
    @GetMapping("/approvals") public Page<com.example.inventory_service.dto.StockDocumentResponse> approvals(
        @RequestHeader(value="Authorization",required=false) String auth,@PathVariable UUID warehouseId,Pageable page){
        access.authorizeRoles(auth,warehouseId,"COMPANY_ADMIN","SYSTEM_ADMIN");return query.approvals(warehouseId,page);
    }
    @GetMapping("/movements")
    public Page<Movement> movements(@RequestHeader(value="Authorization",required=false) String auth,@PathVariable UUID warehouseId,
        @RequestParam(required=false) UUID productId,@RequestParam(required=false) UUID lotId,@RequestParam(required=false) UUID actorId,
        @RequestParam(required=false) String documentType,@RequestParam(required=false) Instant from,@RequestParam(required=false) Instant to,
        @PageableDefault(size=20,sort="createdAt",direction=Sort.Direction.DESC) Pageable page){
        access.authorize(auth,warehouseId,false);return query.movements(warehouseId,productId,lotId,actorId,documentType,from,to,page);
    }
    @GetMapping("/alerts") public List<Alert> alerts(@RequestHeader(value="Authorization",required=false) String auth,@PathVariable UUID warehouseId){access.authorize(auth,warehouseId,false);return query.alerts(warehouseId);}
    @GetMapping(value="/documents/{id}/print",produces="text/html;charset=UTF-8")
    public String print(@RequestHeader(value="Authorization",required=false) String auth,@PathVariable UUID warehouseId,@PathVariable UUID id){access.authorize(auth,warehouseId,false);return query.print(warehouseId,id);}
}
