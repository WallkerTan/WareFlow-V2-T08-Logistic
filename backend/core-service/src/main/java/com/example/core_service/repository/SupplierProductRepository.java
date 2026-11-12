package com.example.core_service.repository;
import com.example.core_service.entity.SupplierProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface SupplierProductRepository extends JpaRepository<SupplierProduct,UUID> {
    List<SupplierProduct> findBySupplierId(UUID id);
    boolean existsBySupplierIdAndSkuIgnoreCaseAndIdNot(UUID supplierId,String sku,UUID id);
}
