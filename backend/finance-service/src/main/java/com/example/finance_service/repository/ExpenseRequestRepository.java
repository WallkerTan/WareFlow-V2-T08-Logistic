package com.example.finance_service.repository;
import com.example.finance_service.entity.ExpenseRequest;
import org.springframework.data.jpa.repository.*;
import java.util.*;
public interface ExpenseRequestRepository extends JpaRepository<ExpenseRequest,UUID>,JpaSpecificationExecutor<ExpenseRequest>{
}
