package com.example.core_service.controller;

import com.example.core_service.dto.request.SupplierRequest;
import com.example.core_service.dto.request.SupplierProductRequest;
import com.example.core_service.service.SupplierService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/suppliers")
@RequiredArgsConstructor
public class SupplierController {
    private final SupplierService suppliers;
    @GetMapping
    public Page<Map<String, Object>> list(@PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) { return suppliers.list(pageable); }
    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable UUID id) { return suppliers.get(id); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> create(@Valid @RequestBody SupplierRequest request) { return suppliers.save(null, request); }
    @PutMapping("/{id}")
    public Map<String, Object> update(@PathVariable UUID id, @Valid @RequestBody SupplierRequest request) { return suppliers.save(id, request); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) { suppliers.delete(id); }
    @GetMapping("/{id}/products")
    public List<Map<String, Object>> products(@PathVariable UUID id) { return suppliers.products(id); }
    @PostMapping("/{id}/products") @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createProduct(@PathVariable UUID id, @Valid @RequestBody SupplierProductRequest request) { return suppliers.saveProduct(id, null, request); }
    @PutMapping("/{id}/products/{productId}")
    public Map<String, Object> updateProduct(@PathVariable UUID id, @PathVariable UUID productId, @Valid @RequestBody SupplierProductRequest request) { return suppliers.saveProduct(id, productId, request); }
    @DeleteMapping("/{id}/products/{productId}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteProduct(@PathVariable UUID id, @PathVariable UUID productId) { suppliers.deleteProduct(id, productId); }
}
