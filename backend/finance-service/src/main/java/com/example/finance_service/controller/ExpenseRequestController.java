package com.example.finance_service.controller;
import com.example.finance_service.entity.*;
import com.example.finance_service.repository.*;
import com.example.finance_service.security.FinanceAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
@RestController @RequestMapping("/expense-requests") @RequiredArgsConstructor @Transactional(readOnly = true)
public class ExpenseRequestController {
    private final ExpenseRequestRepository requests;
    private final FinanceAccessService access;
    @GetMapping
    public Page<ExpenseRequest> list(@RequestHeader(value="Authorization",required=false) String auth,@RequestParam(required=false) UUID companyId,
        @RequestParam(required=false) UUID warehouseId,@RequestParam(required=false) String status,Pageable page){
        var user = access.authenticate(auth, "COMPANY_ADMIN", "WAREHOUSE_MANAGER", "SYSTEM_ADMIN");
        UUID company = access.company(user, companyId);
        access.warehouse(user, warehouseId, company);
        return requests.findAll((root, query, cb) -> {
            var filters = new ArrayList<jakarta.persistence.criteria.Predicate>();
            filters.add(cb.equal(root.get("companyId"), company));
            if (warehouseId != null) filters.add(cb.equal(root.get("warehouseId"), warehouseId));
            if (status != null) filters.add(cb.equal(root.get("status"), status));
            return cb.and(filters.toArray(jakarta.persistence.criteria.Predicate[]::new));
        }, page);
    }
}
