package com.example.finance_service.controller;
import com.example.finance_service.entity.*;
import com.example.finance_service.entity.enums.*;
import com.example.finance_service.repository.*;
import com.example.finance_service.security.FinanceAccessService;
import com.example.finance_service.service.FinanceService;
import com.example.finance_service.dto.TransactionRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
@RestController @RequestMapping("/expense-requests") @RequiredArgsConstructor @Transactional
public class ExpenseRequestController {
    private final ExpenseRequestRepository requests;
    private final FinanceAccessService access;
    private final FinanceService finance;
    public record Create(@NotNull UUID warehouseId,@NotNull TransactionCategory category,
                         @NotNull @DecimalMin("0.01") @Digits(integer=16,fraction=2) BigDecimal amount,@Size(max=4000) String note){}
    public record Decision(@Size(max=2000) String note){}
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public ExpenseRequest create(@RequestHeader(value="Authorization",required=false) String auth,@Valid @RequestBody Create r){
        var u=access.authenticate(auth,"COMPANY_ADMIN","WAREHOUSE_MANAGER");UUID company=access.company(u,null);access.warehouse(u,r.warehouseId(),company);
        if(r.category()==TransactionCategory.FEE)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Phí hệ thống được tạo tự động");
        var e=new ExpenseRequest();e.setCompanyId(company);e.setWarehouseId(r.warehouseId());e.setCreatedBy(u.id());e.setCreatedAt(Instant.now());e.setStatus("PENDING");e.setCategory(r.category());e.setAmount(r.amount());e.setNote(r.note());requests.save(e);
        finance.recordAudit(company,u.id(),"REQUEST_EXPENSE",e.getId().toString(),Map.of("amount",r.amount()));return e;
    }
    @GetMapping
    public Page<ExpenseRequest> list(@RequestHeader(value="Authorization",required=false) String auth,@RequestParam(required=false) UUID companyId,
        @RequestParam(required=false) UUID warehouseId,@RequestParam(required=false) String status,Pageable page){
        var u=access.authenticate(auth,"COMPANY_ADMIN","WAREHOUSE_MANAGER","SYSTEM_ADMIN");UUID company=access.company(u,companyId);access.warehouse(u,warehouseId,company);
        return requests.findAll((r,q,c)->{var p=new ArrayList<jakarta.persistence.criteria.Predicate>();p.add(c.equal(r.get("companyId"),company));if(warehouseId!=null)p.add(c.equal(r.get("warehouseId"),warehouseId));if(status!=null)p.add(c.equal(r.get("status"),status));return c.and(p.toArray(jakarta.persistence.criteria.Predicate[]::new));},page);
    }
    @PostMapping("/{id}/{action:approve|reject}")
    public ExpenseRequest decide(@RequestHeader(value="Authorization",required=false) String auth,@PathVariable UUID id,@PathVariable String action,@RequestBody(required=false) @Valid Decision r){
        var u=access.authenticate(auth,"COMPANY_ADMIN","SYSTEM_ADMIN");
        var e=requests.lock(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy đề nghị chi"));
        UUID company=access.company(u,e.getCompanyId());access.warehouse(u,e.getWarehouseId(),company);
        String expected=action.equals("approve")?"APPROVED":"REJECTED";
        if(expected.equals(e.getStatus()))return e;
        if(!"PENDING".equals(e.getStatus()))throw new ResponseStatusException(HttpStatus.CONFLICT,"Đề nghị đã xử lý");
        if(action.equals("approve")){
            var tx=finance.createTransaction(company,new TransactionRequest(TransactionType.EXPENSE,e.getCategory(),e.getAmount(),e.getWarehouseId(),e.getId(),e.getNote()),u);e.setTransactionId(tx.id());
        }
        e.setStatus(expected);e.setDecidedBy(u.id());e.setDecidedAt(Instant.now());e.setDecisionNote(r==null?null:r.note());
        finance.recordAudit(company,u.id(),expected+"_EXPENSE",e.getId().toString(),Map.of("amount",e.getAmount()));return requests.save(e);
    }
}
