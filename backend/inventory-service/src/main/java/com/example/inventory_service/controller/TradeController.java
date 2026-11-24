package com.example.inventory_service.controller;
import com.example.inventory_service.service.TradeService;
import com.example.inventory_service.entity.*;
import com.example.inventory_service.security.WarehouseAccessService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.client.RestClientResponseException;
import java.util.*;
@RestController @RequestMapping("/warehouses/{warehouseId}/trade") @RequiredArgsConstructor
public class TradeController {
    private final TradeService trade;
    private final WarehouseAccessService access;
    @GetMapping("/batches")
    public List<TradeBatch> batches(@RequestHeader("Authorization") String auth,@PathVariable UUID warehouseId) {
        var user=access.authorizeRoles(auth,warehouseId,"COMPANY_ADMIN","WAREHOUSE_MANAGER");return trade.batches(user.companyId());
    }
    @PostMapping("/batches")
    public TradeBatch create(@RequestHeader("Authorization") String auth,@PathVariable UUID warehouseId,@Valid @RequestBody TradeService.BatchRequest request) {
        var user=access.authorizeRoles(auth,warehouseId,"COMPANY_ADMIN","WAREHOUSE_MANAGER");return trade.createBatch(request,user,auth);
    }
    @GetMapping("/operations")
    public List<TradeOperation> operations(@RequestHeader("Authorization") String auth,@PathVariable UUID warehouseId) {
        access.authorizeRoles(auth,warehouseId,"COMPANY_ADMIN","WAREHOUSE_MANAGER","SYSTEM_ADMIN");return trade.list(warehouseId);
    }
    @PostMapping("/imports")
    public TradeOperation inbound(@RequestHeader("Authorization") String auth,@PathVariable UUID warehouseId,@Valid @RequestBody TradeService.ImportRequest request) {
        var user=access.authorizeRoles(auth,warehouseId,"COMPANY_ADMIN","WAREHOUSE_MANAGER");
        var operation=trade.createImport(warehouseId,request,user);return settle(operation);
    }
    @PostMapping("/outbound")
    public TradeOperation outbound(@RequestHeader("Authorization") String auth,@PathVariable UUID warehouseId,@Valid @RequestBody TradeService.OutRequest request) {
        var user=access.authorizeRoles(auth,warehouseId,"COMPANY_ADMIN","WAREHOUSE_MANAGER");
        if(request.kind().equals("TRANSFER")) {
            if(request.targetWarehouseId()==null)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Chọn kho nhận");
            access.authorizeRoles(auth,request.targetWarehouseId(),"COMPANY_ADMIN");
        }
        var operation=trade.createOutbound(warehouseId,request,user);return settle(operation);
    }
    @PostMapping("/operations/{id}/{action}")
    public TradeOperation action(@RequestHeader("Authorization") String auth,@PathVariable UUID warehouseId,@PathVariable UUID id,@PathVariable String action) {
        var user=access.authorizeRoles(auth,warehouseId,"COMPANY_ADMIN","WAREHOUSE_MANAGER");
        return settle(trade.action(warehouseId,id,action,user));
    }
    private TradeOperation settle(TradeOperation op) {
        if(!op.getStatus().equals("PAYMENT_PENDING"))return op;
        try{return trade.settle(op.getId());}
        catch(RestClientResponseException error){throw new ResponseStatusException(error.getStatusCode(),"Thanh toán chưa hoàn tất. Kiểm tra số dư (gồm phí 5%), cấp ngân sách nếu thiếu rồi chọn Thử thanh toán lại.");}
        catch(org.springframework.web.client.RestClientException error){throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Yêu cầu đã lưu, thanh toán đang chờ. Thử lại khi dịch vụ tài chính hoạt động.");}
    }
}
