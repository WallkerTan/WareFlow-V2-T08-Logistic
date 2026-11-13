package com.example.delivery_service.repository;

import com.example.delivery_service.entity.Shipment;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface ShipmentRepository extends JpaRepository<Shipment, UUID>, JpaSpecificationExecutor<Shipment> {
    Optional<Shipment> findByIdAndWarehouseId(UUID id, UUID warehouseId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Shipment s where s.id = :id and s.warehouseId = :warehouseId")
    Optional<Shipment> lock(@Param("id") UUID id, @Param("warehouseId") UUID warehouseId);
}
