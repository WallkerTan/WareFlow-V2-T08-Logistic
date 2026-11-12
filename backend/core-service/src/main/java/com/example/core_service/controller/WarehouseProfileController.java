package com.example.core_service.controller;
import com.example.core_service.dto.response.WarehouseResponse;
import com.example.core_service.entity.*;
import com.example.core_service.entity.enums.*;
import com.example.core_service.repository.WarehouseRepository;
import com.example.core_service.security.SecurityUtils;
import com.example.core_service.exception.ApiException;
import com.example.core_service.log.AuditLog;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@RestController @RequiredArgsConstructor @Transactional
public class WarehouseProfileController {
    private final WarehouseRepository warehouses;
    @PutMapping("/warehouses/{id}") @org.springframework.security.access.prepost.PreAuthorize("hasRole('SYSTEM_ADMIN')")
    @AuditLog(action="UPDATE_WAREHOUSE",targetType="Warehouse")
    public WarehouseResponse updateWarehouse(@PathVariable UUID id,@Valid @RequestBody com.example.core_service.dto.request.CreateWarehouseRequest r){
        var w=warehouses.lockById(id).orElseThrow(()->ApiException.notFound("Không tìm thấy kho"));
        if(w.getStatus()==WarehouseStatus.ARCHIVED)throw ApiException.conflict("Kho đã lưu trữ");
        if((w.getOwnerCompany()!=null||w.getStatus()==WarehouseStatus.PENDING)&&w.getWarehouseType()!=r.getWarehouseType())throw ApiException.conflict("Không đổi hình thức mua/thuê khi kho đang thuộc công ty hoặc đang giao dịch");
        if(!w.getName().equalsIgnoreCase(r.getName().trim())&&warehouses.existsByNameIgnoreCase(r.getName().trim()))throw ApiException.conflict("Tên kho đã tồn tại");
        w.setName(r.getName().trim());w.setArea(r.getArea());w.setPrice(r.getPrice());w.setRegion(r.getRegion().trim());w.setAddress(r.getAddress());w.setWarehouseType(r.getWarehouseType());return WarehouseResponse.fromEntity(warehouses.save(w));
    }
    @DeleteMapping("/warehouses/{id}") @org.springframework.security.access.prepost.PreAuthorize("hasRole('SYSTEM_ADMIN')")
    @org.springframework.web.bind.annotation.ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT) @AuditLog(action="ARCHIVE_WAREHOUSE",targetType="Warehouse")
    public void archive(@PathVariable UUID id){
        var w=warehouses.lockById(id).orElseThrow(()->ApiException.notFound("Không tìm thấy kho"));if(w.getStatus()==WarehouseStatus.ARCHIVED)return;
        if(w.getOwnerCompany()!=null||(w.getStatus()!=WarehouseStatus.AVAILABLE&&w.getStatus()!=WarehouseStatus.RETURNED))throw ApiException.conflict("Kho đang thuộc công ty hoặc đang giao dịch");
        w.setStatus(WarehouseStatus.ARCHIVED);warehouses.save(w);
    }
    public record Profile(@NotBlank @Size(max=255) String name,@Size(max=1000) String address,
                          @Size(max=50) String phone,@Size(max=4000) String description,List<@Size(max=2048) String> images) {}
    @GetMapping("/warehouses/my-company")
    public Page<WarehouseResponse> mine(Pageable page){
        UUID company=SecurityUtils.getCurrentCompanyId();if(company==null)throw ApiException.forbidden("Tài khoản không thuộc công ty");
        return warehouses.findAll((r,q,c)->c.equal(r.get("ownerCompany").get("id"),company),page).map(WarehouseResponse::fromEntity);
    }
    @PutMapping("/warehouses/{id}/profile") @AuditLog(action="UPDATE_WAREHOUSE_PROFILE",targetType="Warehouse")
    public WarehouseResponse update(@PathVariable UUID id,@Valid @RequestBody Profile r){
        Warehouse w=warehouses.findById(id).orElseThrow(()->ApiException.notFound("Không tìm thấy kho"));
        UserRole role=SecurityUtils.getCurrentUserRole();
        boolean company=role==UserRole.COMPANY_ADMIN&&w.getOwnerCompany()!=null&&w.getOwnerCompany().getId().equals(SecurityUtils.getCurrentCompanyId());
        boolean manager=role==UserRole.WAREHOUSE_MANAGER&&w.getHandover()!=null&&SecurityUtils.getCurrentUserId().toString().equals(w.getHandover().get("managerId"));
        if(role!=UserRole.SYSTEM_ADMIN&&!company&&!manager)throw ApiException.forbidden("Không có quyền cập nhật kho");
        if(!w.getName().equalsIgnoreCase(r.name().trim())&&warehouses.existsByNameIgnoreCase(r.name().trim()))throw ApiException.conflict("Tên kho đã tồn tại");
        w.setName(r.name().trim());w.setAddress(r.address());
        Map<String,Object> profile=new HashMap<>();if(r.phone()!=null)profile.put("phone",r.phone());if(r.description()!=null)profile.put("description",r.description());if(r.images()!=null)profile.put("images",r.images());w.setProfile(profile);
        return WarehouseResponse.fromEntity(warehouses.save(w));
    }
}
