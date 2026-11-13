package com.example.inventory_service.repository;

import com.example.inventory_service.entity.StockLot;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StockLotRepository extends JpaRepository<StockLot, UUID> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select l from StockLot l join fetch l.product p where l.id = :id and p.warehouseId = :warehouseId and l.deletedAt is null and p.deletedAt is null")
    Optional<StockLot> findForUpdate(@Param("id") UUID id, @Param("warehouseId") UUID warehouseId);
    List<StockLot> findByProduct_IdAndDeletedAtIsNull(UUID productId);
    Optional<StockLot> findByIdAndProduct_IdAndProduct_WarehouseIdAndDeletedAtIsNull(UUID id, UUID productId, UUID warehouseId);
    Optional<StockLot> findByProduct_IdAndLotCodeIgnoreCaseAndDeletedAtIsNull(UUID productId, String lotCode);
    @Query("select coalesce(sum(l.quantity), 0) from StockLot l where l.product.id = :productId and l.deletedAt is null")
    BigDecimal sumQuantity(@Param("productId") UUID productId);
    @Query("select coalesce(sum(l.reserved), 0) from StockLot l where l.product.id = :productId and l.deletedAt is null")
    BigDecimal sumReserved(@Param("productId") UUID productId);
    boolean existsByProduct_IdAndDeletedAtIsNullAndQuantityGreaterThan(UUID productId, BigDecimal quantity);
}
