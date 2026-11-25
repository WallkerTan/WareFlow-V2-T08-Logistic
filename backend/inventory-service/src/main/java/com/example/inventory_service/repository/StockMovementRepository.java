package com.example.inventory_service.repository;

import com.example.inventory_service.dto.StockMovementResponse;
import com.example.inventory_service.entity.StockMovement;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {
    @Query(value = """
            select new com.example.inventory_service.dto.StockMovementResponse(
                m.id, p.sku, l.lotCode, m.documentType, m.qtyChange, m.createdAt, m.note)
            from StockMovement m join m.product p left join m.lot l
            where m.warehouseId = :warehouseId
            """, countQuery = "select count(m) from StockMovement m where m.warehouseId = :warehouseId")
    Page<StockMovementResponse> findHistory(@Param("warehouseId") UUID warehouseId, Pageable pageable);

    boolean existsByLot_Id(UUID lotId);
    boolean existsByProduct_Id(UUID productId);
}
