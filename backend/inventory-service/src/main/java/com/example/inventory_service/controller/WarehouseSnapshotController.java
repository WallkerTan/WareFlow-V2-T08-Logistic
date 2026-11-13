package com.example.inventory_service.controller;

import com.example.inventory_service.entity.Product;
import com.example.inventory_service.entity.StockLot;
import com.example.inventory_service.repository.ProductRepository;
import com.example.inventory_service.repository.StockLotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

/**
 * Endpoint cung cấp snapshot tồn kho của kho phục vụ nghiệp vụ bàn giao kho (mục 2.4 / core-service).
 */
@RestController
@RequestMapping("/warehouses/{warehouseId}")
@RequiredArgsConstructor
@Slf4j
public class WarehouseSnapshotController {

    private final ProductRepository productRepository;
    private final StockLotRepository stockLotRepository;
    private final com.example.inventory_service.security.WarehouseAccessService access;

    @GetMapping("/snapshot")
    public Map<String, Object> getWarehouseSnapshot(@PathVariable UUID warehouseId,
            @RequestHeader(value="Authorization",required=false) String authorization) {
        access.authorize(authorization,warehouseId,false);
        List<Product> products = productRepository.findAll((root, query, cb) ->
                cb.and(cb.equal(root.get("warehouseId"), warehouseId), cb.isNull(root.get("deletedAt"))));

        BigDecimal totalQuantity = BigDecimal.ZERO;
        List<Map<String, Object>> items = new ArrayList<>();

        for (Product product : products) {
            List<StockLot> lots = stockLotRepository.findByProduct_IdAndDeletedAtIsNull(product.getId());
            BigDecimal productQty = lots.stream()
                    .map(StockLot::getQuantity)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            totalQuantity = totalQuantity.add(productQty);

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("productId", product.getId().toString());
            item.put("sku", product.getSku());
            item.put("name", product.getName());
            item.put("unit", product.getUnit());
            item.put("totalQuantity", productQty);
            item.put("lotCount", lots.size());
            items.add(item);
        }

        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("warehouseId", warehouseId.toString());
        snapshot.put("available", true);
        snapshot.put("totalProducts", products.size());
        snapshot.put("totalQuantity", totalQuantity);
        snapshot.put("snapshotTime", Instant.now().toString());
        snapshot.put("items", items);

        log.info("Cung cấp snapshot tồn kho cho warehouseId={}: {} sản phẩm, tổng tồn {}",
                warehouseId, products.size(), totalQuantity);
        return snapshot;
    }
}
