package com.example.core_service.repository;

import com.example.core_service.entity.Supplier;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import java.util.Optional;
import java.util.UUID;

public interface SupplierRepository extends JpaRepository<Supplier, UUID>, JpaSpecificationExecutor<Supplier> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Supplier s where s.id = :id and s.deletedAt is null")
    Optional<Supplier> findForUpdate(UUID id);
}
