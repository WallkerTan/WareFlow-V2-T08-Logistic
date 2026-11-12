package com.example.finance_service.repository;
import com.example.finance_service.entity.FinanceAudit;
import org.springframework.data.jpa.repository.*;
import java.util.UUID;
public interface FinanceAuditRepository extends JpaRepository<FinanceAudit,UUID>,JpaSpecificationExecutor<FinanceAudit>{}
