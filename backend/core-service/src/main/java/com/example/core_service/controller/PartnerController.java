package com.example.core_service.controller;
import com.example.core_service.entity.*;
import com.example.core_service.entity.enums.CompanyBusinessModel;
import com.example.core_service.service.PartnerService;
import com.example.core_service.service.PartnerService.*;
import com.example.core_service.log.AuditLog;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import java.util.*;
@RestController @RequiredArgsConstructor
public class PartnerController {
    private final PartnerService service;
    private String kind(String collection){return "suppliers".equals(collection)?"SUPPLIER":"CUSTOMER";}
    @GetMapping("/{collection:suppliers|customers}")
    public Page<Partner> list(@PathVariable String collection,@RequestParam(required=false) String search,@RequestParam(required=false) CompanyBusinessModel businessModel,Pageable page){return service.list(kind(collection),search,businessModel,page);}
    @GetMapping("/{collection:suppliers|customers}/{id}")
    public Partner get(@PathVariable String collection,@PathVariable UUID id){return service.get(kind(collection),id,false);}
    @PostMapping("/{collection:suppliers|customers}") @ResponseStatus(HttpStatus.CREATED) @AuditLog(action="CREATE_PARTNER",targetType="Partner")
    public Partner create(@PathVariable String collection,@Valid @RequestBody Request r){return service.save(kind(collection),null,r);}
    @PutMapping("/{collection:suppliers|customers}/{id}") @AuditLog(action="UPDATE_PARTNER",targetType="Partner")
    public Partner update(@PathVariable String collection,@PathVariable UUID id,@Valid @RequestBody Request r){return service.save(kind(collection),id,r);}
    @DeleteMapping("/{collection:suppliers|customers}/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @AuditLog(action="DELETE_PARTNER",targetType="Partner")
    public void delete(@PathVariable String collection,@PathVariable UUID id){service.delete(kind(collection),id);}
    @GetMapping("/suppliers/{id}/products") public List<SupplierProduct> products(@PathVariable UUID id){return service.products(id);}
    @PostMapping("/suppliers/{id}/products") @ResponseStatus(HttpStatus.CREATED) @AuditLog(action="CREATE_SUPPLIER_PRODUCT",targetType="SupplierProduct")
    public SupplierProduct add(@PathVariable UUID id,@Valid @RequestBody ProductRequest r){return service.product(id,null,r);}
    @PutMapping("/suppliers/{id}/products/{productId}") @AuditLog(action="UPDATE_SUPPLIER_PRODUCT",targetType="SupplierProduct")
    public SupplierProduct updateProduct(@PathVariable UUID id,@PathVariable UUID productId,@Valid @RequestBody ProductRequest r){return service.product(id,productId,r);}
    @DeleteMapping("/suppliers/{id}/products/{productId}") @ResponseStatus(HttpStatus.NO_CONTENT) @AuditLog(action="DELETE_SUPPLIER_PRODUCT",targetType="SupplierProduct")
    public void deleteProduct(@PathVariable UUID id,@PathVariable UUID productId){service.deleteProduct(id,productId);}
}
