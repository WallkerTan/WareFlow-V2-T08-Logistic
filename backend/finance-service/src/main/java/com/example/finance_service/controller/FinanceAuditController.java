package com.example.finance_service.controller;
import com.example.finance_service.entity.FinanceAudit;
import com.example.finance_service.repository.FinanceAuditRepository;
import com.example.finance_service.security.FinanceAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController @RequiredArgsConstructor
public class FinanceAuditController {
    private final FinanceAccessService access;
    private final FinanceAuditRepository audits;
    @GetMapping("/audit-logs")
    public Page<FinanceAudit> list(@RequestHeader(value="Authorization",required=false) String auth,
        @RequestParam(required=false) UUID companyId,@RequestParam(required=false) UUID actorId,@RequestParam(required=false) String action,Pageable page){
        var user=access.authenticate(auth,"COMPANY_ADMIN","SYSTEM_ADMIN");UUID company=access.company(user,companyId);
        return audits.findAll((r,q,c)->{var p=new ArrayList<jakarta.persistence.criteria.Predicate>();p.add(c.equal(r.get("companyId"),company));if(actorId!=null)p.add(c.equal(r.get("actorId"),actorId));if(action!=null)p.add(c.equal(r.get("action"),action));return c.and(p.toArray(jakarta.persistence.criteria.Predicate[]::new));},page);
    }
}
