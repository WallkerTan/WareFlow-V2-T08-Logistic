package com.example.core_service.controller;
import com.example.core_service.entity.enums.*;
import com.example.core_service.repository.*;
import com.example.core_service.service.*;
import com.example.core_service.exception.ApiException;
import com.example.core_service.log.AuditLog;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
@RestController @RequiredArgsConstructor
public class CompanyLifecycleController {
    private final CompanyRepository companies;
    private final WarehouseRepository warehouses;
    private final NotificationService notifications;
    private final WarehouseTransactionRepository transactions;
    @DeleteMapping("/companies/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    @AuditLog(action="DELETE_COMPANY",targetType="Company") @Transactional
    public void delete(@PathVariable UUID id){
        var company=companies.lockById(id).orElseThrow(()->ApiException.notFound("Không tìm thấy công ty"));
        if(company.getStatus()==CompanyStatus.DELETED)return;
        if(transactions.count((r,q,c)->c.and(c.equal(r.get("company").get("id"),id),r.get("status").in(WarehouseTransactionStatus.PENDING,WarehouseTransactionStatus.NEGOTIATING)))>0)
            throw ApiException.conflict("Công ty còn giao dịch kho chưa xử lý");
        if(warehouses.count((r,q,c)->c.equal(r.get("ownerCompany").get("id"),id))>0)throw ApiException.conflict("Công ty phải trả hoặc bàn giao các kho trước khi xóa");
        company.setStatus(CompanyStatus.DELETED);companies.save(company);
        notifications.notifyAllSystemAdmins("COMPANY_DELETED","Công ty đã xóa: "+company.getName(),Map.of("companyId",id.toString()));
    }
}
