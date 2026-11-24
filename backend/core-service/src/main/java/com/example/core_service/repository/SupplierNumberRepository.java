package com.example.core_service.repository;
import com.example.core_service.entity.SupplierNumber;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface SupplierNumberRepository extends JpaRepository<SupplierNumber, Long> {
    Optional<SupplierNumber> findBySupplierId(UUID supplierId);
}
