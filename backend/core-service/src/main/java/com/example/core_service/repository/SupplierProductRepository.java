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
          and lower(s.name) = coalesce(lower(cast(:supplier as string)), lower(s.name))
        """)
    List<SupplierProduct> chatMatches(UUID company, String term, String supplier);
    List<SupplierProduct> findBySupplierId(UUID id);
    List<SupplierProduct> findBySupplierIdInOrderByNameAsc(Collection<UUID> ids);
    boolean existsBySupplierIdAndSkuIgnoreCaseAndIdNot(UUID supplierId,String sku,UUID id);
}
