package com.example.finance_service.controller;
import com.example.finance_service.entity.enums.*;
import com.example.finance_service.security.FinanceAccessService;
import com.example.finance_service.service.WalletLedger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.*;

@RestController
public class DocumentSettlementController {
    private final FinanceAccessService access;
    private final WalletLedger ledger;
    private final RestClient inventory,delivery;
    public DocumentSettlementController(FinanceAccessService access, WalletLedger ledger,
            @Value("${INVENTORY_SERVICE_URL:http://localhost:8082}") String stock,
            @Value("${DELIVERY_SERVICE_URL:http://localhost:8084}") String shipments) {
        this.access=access;this.ledger=ledger;inventory=RestClient.create(stock);delivery=RestClient.create(shipments);
    }
    @Value("${CORE_SERVICE_URL:http://localhost:8081}") private String coreUrl;
    record Market(UUID companyId, UUID warehouseId,String type,String status,BigDecimal offeredPrice,Map<String,Object> negotiation){}
    @PostMapping("/wallets/marketplace/{id}") public void marketplace(@RequestHeader("Authorization") String auth,@PathVariable UUID id) {
        var actor=access.authenticate(auth,"SYSTEM_ADMIN","COMPANY_ADMIN");
        var offer=RestClient.create(coreUrl).get().uri("/warehouse-transactions/{id}/payment",id).header("Authorization",auth).retrieve().body(Market.class);
        if(offer==null || !"APPROVED".equals(offer.status()) || !Set.of("BUY","RENT").contains(offer.type()))throw invalid();
        Object seller=offer.negotiation()==null?null:offer.negotiation().get("sellerCompanyId");
        ledger.marketplace(offer.companyId(),seller==null?null:UUID.fromString(seller.toString()),offer.warehouseId(),actor.id(),id,offer.offeredPrice());
    }
    record Import(UUID id,UUID warehouseId,UUID companyId,String status,boolean warehousePayment,BigDecimal total){}
    record Export(UUID id,String type,String status,Map<String,Object> approval){}
    record Shipment(UUID id,UUID documentId,String status,BigDecimal codAmount){}
    @PostMapping("/wallets/settle/{operation:IMPORT|SALE|RETURN}/{warehouse}/{id}")
    public void settle(@RequestHeader("Authorization") String auth,@PathVariable String operation,@PathVariable UUID warehouse,@PathVariable UUID id) {
        var actor=access.authenticate(auth,"COMPANY_ADMIN","WAREHOUSE_MANAGER");
        var company=access.company(actor,null);
        access.warehouse(actor,warehouse,company);
        String root="/warehouses/"+warehouse;
        if(operation.equals("IMPORT")){
            if(!actor.role().equals("COMPANY_ADMIN"))throw new ResponseStatusException(HttpStatus.FORBIDDEN);
            Import order=inventory.get().uri(root+"/batch-imports/"+id).header("Authorization",auth).retrieve().body(Import.class);
            if(order==null || !company.equals(order.companyId()) || !warehouse.equals(order.warehouseId()) ||
                    !Set.of("PROCESSING","DONE").contains(order.status()))throw invalid();
            ledger.post(operation,company,warehouse,actor.id(),id,!order.warehousePayment(),order.total(),
                        TransactionType.EXPENSE,TransactionCategory.PURCHASE,"Nhập lô "+id);
            return;
        }
        UUID exportId=id;
        if(operation.equals("SALE")){
            var shipment=delivery.get().uri(root+"/shipments/"+id).header("Authorization",auth).retrieve().body(Shipment.class);
            if(shipment==null || !"DELIVERED".equals(shipment.status()))throw invalid();
            exportId=shipment.documentId();
        }
        var doc=inventory.get().uri(root+"/exports/"+exportId).header("Authorization",auth).retrieve().body(Export.class);
        if(doc==null || !"DONE".equals(doc.status()) || !("EXPORT_"+operation).equals(doc.type()) ||
                doc.approval()==null || doc.approval().get("total")==null)throw invalid();
        var amount=new BigDecimal(doc.approval().get("total").toString());
        if(operation.equals("RETURN") && amount.compareTo(new BigDecimal("10000000"))<0)throw invalid();
        ledger.post(operation,company,warehouse,actor.id(),exportId,true,amount,TransactionType.INCOME,
                operation.equals("SALE")?TransactionCategory.SALE:TransactionCategory.OTHER,operation+" · "+exportId);
    }
    private static ResponseStatusException invalid(){return new ResponseStatusException(HttpStatus.CONFLICT,"Chứng từ chưa đủ điều kiện quyết toán.");}
}
