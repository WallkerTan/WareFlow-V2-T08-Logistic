package com.example.core_service.controller;
import com.example.core_service.repository.*;
import com.example.core_service.security.SecurityUtils;
import com.example.core_service.service.WarehouseTransactionService;
import com.example.core_service.entity.enums.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.*;
@RestController @RequiredArgsConstructor @PreAuthorize("hasRole('COMPANY_ADMIN')")
public class CompanyWorkspaceController {
    private final WarehouseRepository warehouses;
    private final UserRepository users;
    private final WarehouseTransactionRepository transactions;
    private final WarehouseTransactionService transactionService;
    @Value("${FINANCE_SERVICE_URL:http://localhost:8083}") private String financeUrl;
    @Value("${INVENTORY_SERVICE_URL:http://localhost:8082}") private String inventoryUrl;
    @GetMapping("/reports/company")
    public Map<String,Object> dashboard(){
        UUID id=SecurityUtils.getCurrentCompanyId();
        return Map.of("companyId",id,"warehouses",warehouses.count((r,q,c)->c.equal(r.get("ownerCompany").get("id"),id)),
                "employees",users.findByCompany_IdAndRole(id,UserRole.WAREHOUSE_MANAGER).size(),
                "pendingWarehouseTransactions",transactions.count((r,q,c)->c.and(c.equal(r.get("company").get("id"),id),r.get("status").in(WarehouseTransactionStatus.PENDING,WarehouseTransactionStatus.NEGOTIATING))));
    }
    @GetMapping("/approvals")
    public Map<String,Object> approvals(@RequestHeader("Authorization") String auth,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){
        if(page<0||size<1||size>100)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Phân trang không hợp lệ");
        var factory=new org.springframework.http.client.SimpleClientHttpRequestFactory();factory.setConnectTimeout(5000);factory.setReadTimeout(10000);
        RestClient client=RestClient.builder().requestFactory(factory).build();
        UUID company=SecurityUtils.getCurrentCompanyId();Map<String,Object> result=new LinkedHashMap<>();
        result.put("warehouseTransactions",transactionService.list(WarehouseTransactionStatus.PENDING,PageRequest.of(page,size)));
        result.put("negotiatingWarehouseTransactions",transactionService.list(WarehouseTransactionStatus.NEGOTIATING,PageRequest.of(page,size)));
        try{
            result.put("expenses",client.get().uri(financeUrl+"/expense-requests?status=PENDING&page={page}&size={size}",page,size).header("Authorization",auth).retrieve().body(Map.class));
            List<Map<String,Object>> stock=new ArrayList<>();
            for(var w:warehouses.findAll((r,q,c)->c.equal(r.get("ownerCompany").get("id"),company))){
                var data=client.get().uri(inventoryUrl+"/warehouses/{id}/approvals?page={page}&size={size}",w.getId(),page,size).header("Authorization",auth).retrieve().body(Map.class);
                stock.add(Map.of("warehouseId",w.getId(),"documents",data==null?Map.of():data));
            }
            result.put("inventory",stock);return result;
        }catch(org.springframework.web.client.RestClientException ex){throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Trung tâm phê duyệt chưa kết nối được finance/inventory-service");}
    }
}
