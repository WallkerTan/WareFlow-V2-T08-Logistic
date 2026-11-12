package com.example.finance_service.repository;
import com.example.finance_service.entity.ExpenseRequest;
import org.springframework.data.jpa.repository.*;
import java.util.*;
public interface ExpenseRequestRepository extends JpaRepository<ExpenseRequest,UUID>,JpaSpecificationExecutor<ExpenseRequest>{
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE) @Query("select e from ExpenseRequest e where e.id = :id")
    Optional<ExpenseRequest> lock(UUID id);
}
