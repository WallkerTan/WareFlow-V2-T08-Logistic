package com.example.inventory_service.repository;

import com.example.inventory_service.entity.Product;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ProductRepository extends JpaRepository<Product, UUID>, JpaSpecificationExecutor<Product> {
    boolean existsByWarehouseIdAndSkuIgnoreCaseAndDeletedAtIsNull(UUID warehouseId, String sku);
    boolean existsByWarehouseIdAndSkuIgnoreCaseAndIdNotAndDeletedAtIsNull(UUID warehouseId, String sku, UUID id);
    Optional<Product> findByIdAndWarehouseIdAndDeletedAtIsNull(UUID id, UUID warehouseId);
}
