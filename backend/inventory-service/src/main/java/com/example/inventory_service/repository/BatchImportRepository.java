package com.example.inventory_service.repository;
import com.example.inventory_service.entity.BatchImport;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
import java.util.*;
public interface BatchImportRepository extends JpaRepository<BatchImport,UUID> {
    List<BatchImport> findByWarehouseIdOrderByCreatedAtDesc(UUID warehouseId);
    Optional<BatchImport> findByIdAndWarehouseId(UUID id,UUID warehouseId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from BatchImport i where i.id=:id and i.warehouseId=:warehouse")
    Optional<BatchImport> locked(UUID id,UUID warehouse);
}
