package com.example.inventory_service.repository;

import com.example.inventory_service.entity.StockMovement;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {
    boolean existsByLot_Id(UUID lotId);
    boolean existsByProduct_Id(UUID productId);
}
