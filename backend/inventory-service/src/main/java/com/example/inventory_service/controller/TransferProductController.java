package com.example.inventory_service.controller;

import com.example.inventory_service.repository.ProductRepository;
import com.example.inventory_service.security.WarehouseAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/warehouses/{warehouseId}/transfer-products")
public class TransferProductController {
    private final WarehouseAccessService access;
    private final ProductRepository products;
    public record ProductOption(UUID id, String sku, String name, String unit) {}

    @GetMapping
    @Transactional(readOnly = true)
    public List<ProductOption> list(@RequestHeader(value="Authorization", required=false) String auth,
            @PathVariable UUID warehouseId, @RequestParam UUID targetWarehouseId) {
        access.authorizeTransfer(auth, warehouseId, targetWarehouseId);
        return products.findAll((root, q, cb) -> cb.and(cb.equal(root.get("warehouseId"), targetWarehouseId), cb.isNull(root.get("deletedAt"))))
                .stream().map(p -> new ProductOption(p.getId(), p.getSku(), p.getName(), p.getUnit())).toList();
    }
}
