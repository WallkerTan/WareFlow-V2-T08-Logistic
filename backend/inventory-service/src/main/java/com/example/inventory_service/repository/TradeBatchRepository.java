package com.example.inventory_service.repository;
import com.example.inventory_service.entity.TradeBatch;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
import java.util.*;
public interface TradeBatchRepository extends JpaRepository<TradeBatch,UUID> {
    List<TradeBatch> findByCompanyIdOrderByCreatedAtDesc(UUID companyId);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select b from TradeBatch b where b.id=:id and b.companyId=:companyId")
    Optional<TradeBatch> lock(UUID id,UUID companyId);
}
