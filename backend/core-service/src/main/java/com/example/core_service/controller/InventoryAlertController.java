package com.example.core_service.controller;
import com.example.core_service.entity.AlertReceipt;
import com.example.core_service.entity.enums.*;
import com.example.core_service.repository.*;
import com.example.core_service.service.NotificationService;
import com.example.core_service.exception.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.time.LocalDate;
@RestController @RequiredArgsConstructor
public class InventoryAlertController {
    private final WarehouseRepository warehouses;
    private final UserRepository users;
    private final AlertReceiptRepository receipts;
    private final NotificationService notifications;
    @Value("${INTERNAL_API_KEY:}") private String key;
    public record Alert(@NotNull UUID warehouseId,@NotNull UUID productId,UUID lotId,
                        @NotBlank @Pattern(regexp="LOW_STOCK|NEAR_EXPIRY|EXPIRED") String type,@NotBlank @Size(max=100) String sku){}
    @PostMapping("/internal/inventory-alerts") @Transactional
    public Map<String,String> receive(@RequestHeader(value="X-Internal-Key",required=false) String supplied,@Valid @RequestBody Alert a){
        if(key.isBlank()||supplied==null||!java.security.MessageDigest.isEqual(key.getBytes(java.nio.charset.StandardCharsets.UTF_8),supplied.getBytes(java.nio.charset.StandardCharsets.UTF_8)))throw ApiException.unauthorized("Thông tin dịch vụ không hợp lệ");
        var w=warehouses.findById(a.warehouseId()).orElseThrow(()->ApiException.notFound("Không tìm thấy kho"));
        String id=a.warehouseId()+":"+a.productId()+":"+a.lotId()+":"+a.type()+":"+LocalDate.now();
        if(receipts.existsById(id))return Map.of("status","already_applied");
        var receipt=new AlertReceipt();receipt.setId(id);receipts.saveAndFlush(receipt);
        if(w.getOwnerCompany()==null)return Map.of("status","no_recipient");
        Set<UUID> targets=new HashSet<>();
        for(var admin:users.findByCompany_IdAndRole(w.getOwnerCompany().getId(),UserRole.COMPANY_ADMIN))targets.add(admin.getId());
        if(w.getHandover()!=null&&w.getHandover().get("managerId")!=null){
            UUID manager=UUID.fromString(w.getHandover().get("managerId").toString());
            users.findById(manager).filter(u->u.getCompany()!=null&&u.getCompany().getId().equals(w.getOwnerCompany().getId())).ifPresent(u->targets.add(u.getId()));
        }
        String title=switch(a.type()){case "LOW_STOCK"->"Tồn kho dưới mức tối thiểu";case "NEAR_EXPIRY"->"Lô hàng sắp hết hạn";default->"Lô hàng đã hết hạn";};
        for(UUID target:targets)notifications.sendToUser(target,NotificationScope.COMPANY,a.type(),title+": "+a.sku(),Map.of("warehouseId",a.warehouseId().toString(),"productId",a.productId().toString(),"lotId",a.lotId()==null?"":a.lotId().toString()));
        return Map.of("status","applied");
    }
}
