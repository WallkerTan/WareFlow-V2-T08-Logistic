package com.example.inventory_service.repository;

import com.example.inventory_service.entity.StockDocument;
import com.example.inventory_service.entity.enums.StockDocumentStatus;
import com.example.inventory_service.entity.enums.StockDocumentType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StockDocumentRepository extends JpaRepository<StockDocument, UUID>, JpaSpecificationExecutor<StockDocument> {

    Optional<StockDocument> findByIdAndWarehouseId(UUID id, UUID warehouseId);

    Page<StockDocument> findByWarehouseIdAndType(UUID warehouseId, StockDocumentType type, Pageable pageable);

    Page<StockDocument> findByWarehouseIdAndTypeAndStatus(UUID warehouseId, StockDocumentType type, StockDocumentStatus status, Pageable pageable);

    @Query(value = "SELECT * FROM stock_documents d WHERE d.warehouse_id = :warehouseId AND d.type = 'RECEIPT' AND d.approval ->> 'poId' = :poId ORDER BY d.created_at DESC", nativeQuery = true)
    List<StockDocument> findReceiptsByPoId(@Param("warehouseId") UUID warehouseId, @Param("poId") String poId);
}

