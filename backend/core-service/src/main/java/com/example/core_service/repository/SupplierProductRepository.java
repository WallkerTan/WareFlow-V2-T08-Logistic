package com.example.core_service.repository;
import com.example.core_service.entity.SupplierProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface SupplierProductRepository extends JpaRepository<SupplierProduct,UUID> {
    @org.springframework.data.jpa.repository.Query("""
        select p from SupplierProduct p, Partner s, Company c
        where c.id = :company and s.id = p.supplierId and s.kind = 'SUPPLIER' and s.deleted = false
          and s.businessModel = c.businessModel
          and (lower(p.sku) = lower(:term) or lower(p.name) = lower(:term))
          and (:supplier is null or lower(s.name) = lower(:supplier))
        """)
    List<SupplierProduct> chatMatches(UUID company, String term, String supplier);
    List<SupplierProduct> findBySupplierId(UUID id);
    boolean existsBySupplierIdAndSkuIgnoreCaseAndIdNot(UUID supplierId,String sku,UUID id);
}
