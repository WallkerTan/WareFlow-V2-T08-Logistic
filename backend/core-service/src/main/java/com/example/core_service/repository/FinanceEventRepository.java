package com.example.core_service.repository;
import com.example.core_service.entity.FinanceEvent;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.domain.Pageable;
import java.util.*;
import java.time.Instant;
public interface FinanceEventRepository extends JpaRepository<FinanceEvent,UUID>{
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from FinanceEvent e where e.deliveredAt is null and (e.retryAt is null or e.retryAt <= :now) order by e.occurredAt")
    List<FinanceEvent> pending(Instant now,Pageable page);
}
