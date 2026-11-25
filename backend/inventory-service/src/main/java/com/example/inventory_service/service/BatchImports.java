package com.example.inventory_service.service;
import com.example.inventory_service.entity.*;
import com.example.inventory_service.repository.*;
import com.example.inventory_service.security.WarehouseAccessService.UserIdentity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import jakarta.persistence.EntityManager;
import java.math.*;
import java.util.*;

@Service @Transactional
public class BatchImports implements ApplicationRunner {
    private final JdbcTemplate db;
    private final EntityManager entities;
    private final BatchImportRepository imports;
    private final ProductRepository products;
    private final StockLotRepository lots;
    private final StockMovementRepository movements;
    private final RestClient core,finance;
    public BatchImports(EntityManager entities,JdbcTemplate db,BatchImportRepository imports,ProductRepository products,
            StockLotRepository lots,StockMovementRepository movements,
            @Value("${CORE_SERVICE_URL:http://localhost:8081}") String coreUrl,
            @Value("${FINANCE_SERVICE_URL:http://localhost:8083}") String financeUrl) {
        this.entities=entities;
        this.db=db;this.imports=imports;this.products=products;this.lots=lots;this.movements=movements;
        core=RestClient.create(coreUrl);finance=RestClient.create(financeUrl);
    }
    public void run(ApplicationArguments args) {
        db.execute("create table if not exists batch_reservations(batch_id uuid primary key, import_id uuid not null)");
    }
    public List<UUID> reserved(UUID company) {
        return db.queryForList("select r.batch_id from batch_reservations r join batch_imports i on i.id=r.import_id where i.company_id=?",UUID.class,company);
    }
    public BatchImport create(UUID warehouse,UUID id,List<UUID> ids,UserIdentity actor,String token) {
        if (new HashSet<>(ids).size() != ids.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mỗi lô chỉ được chọn một lần.");
        }
        var previous=imports.findById(id);
        if(previous.isPresent()) {
            var order=previous.get();
            if(!order.getWarehouseId().equals(warehouse)||!order.getCreatedBy().equals(actor.id())
                ||!order.getBatches().stream().map(BatchImport.Batch::id).toList().equals(ids)) throw conflict("Mã yêu cầu đã sử dụng.");
            return order;
        }
        var order=new BatchImport();
        order.setId(id);order.setCreatedBy(actor.id());order.setCompanyId(actor.companyId());order.setWarehouseId(warehouse);
        order.setWarehousePayment("WAREHOUSE_MANAGER".equals(actor.role()));
        order.setStatus(order.isWarehousePayment()?"PENDING":"PROCESSING");
        var selected=new ArrayList<BatchImport.Batch>();
        for(UUID batchId:ids){
            var batch=core.get().uri("/purchase-batches/{id}",batchId).header("Authorization",token).retrieve().body(BatchImport.Batch.class);
            if(batch==null || !actor.companyId().equals(batch.companyId())) throw conflict("Lô không thuộc công ty.");
            if(db.update("insert into batch_reservations values(?,?) on conflict do nothing",batchId,id)==0)
                throw conflict("Lô "+batch.code()+" đã được chọn cho yêu cầu khác.");
            selected.add(batch);
        }
        order.setBatches(selected);
        order.setTotal(selected.stream().map(BatchImport.Batch::total).reduce(BigDecimal.ZERO,BigDecimal::add));
        return imports.save(order);
    }
    public BatchImport prepare(UUID warehouse,UUID id) {
        var o=lock(warehouse,id);
        if("CANCELLED".equals(o.getStatus()))throw conflict("Yêu cầu đã hủy.");
        if("PENDING".equals(o.getStatus()))o.setStatus("PROCESSING");
        return o;
    }
    public BatchImport cancel(UUID warehouse,UUID id,UserIdentity actor) {
        var o=lock(warehouse,id);
        if(!actor.role().equals("COMPANY_ADMIN")&&!actor.id().equals(o.getCreatedBy())) throw conflict("Yêu cầu thuộc người khác.");
        if(!"PENDING".equals(o.getStatus()))throw conflict("Chỉ hủy được yêu cầu đang chờ.");
        db.update("delete from batch_reservations where import_id=?",id);
        o.setStatus("CANCELLED");return o;
    }
    public BatchImport finish(UUID warehouse,UUID id,String token,UUID actor) {
        var o=lock(warehouse,id);
        if("DONE".equals(o.getStatus()))return o;
        if(!"PROCESSING".equals(o.getStatus()))throw conflict("Yêu cầu chưa được duyệt.");
        try {
            finance.post().uri("/wallets/settle/IMPORT/{w}/{id}",warehouse,id).header("Authorization",token).retrieve().toBodilessEntity();
        } catch(RestClientResponseException ex) {
            if(ex.getStatusCode().value()==409) {
                var detail=ex.getResponseBodyAs(org.springframework.http.ProblemDetail.class);
                if (detail != null && detail.getProperties() != null
                        && "INSUFFICIENT_FUNDS".equals(detail.getProperties().get("code"))) {
                    String guidance = o.isWarehousePayment() ? " Công ty cần cấp thêm ngân sách cho kho." : "";
                    o.setPaymentError(detail.getDetail() + guidance);
                    o.setStatus("PENDING");
                    return o;
                }
                throw conflict(detail == null ? "Không thể quyết toán yêu cầu nhập." : detail.getDetail());
            }
            throw ex;
        }
        for(var batch:o.getBatches()) for(var line:batch.lines()){
            Product product=products.findByWarehouseIdAndSkuIgnoreCaseAndDeletedAtIsNull(warehouse,line.sku())
                .orElseGet(()->products.save(Product.builder().warehouseId(warehouse).sku(line.sku()).name(line.name())
                    .unit(line.unit()).barcode(line.barcode()).minStock(BigDecimal.ZERO).build()));
            var lot=lots.save(StockLot.builder().product(product).lotCode(batch.code()).purchaseBatchId(batch.id())
                .supplierId(line.supplierId()).unitCost(line.price()).quantity(line.quantity()).build());
            movements.save(StockMovement.builder().warehouseId(warehouse).product(product).lot(lot).documentType("RECEIPT")
                .documentId(id).actorId(actor).qtyChange(line.quantity()).note(batch.code()).build());
        }
        o.setStatus("DONE");return o;
    }
    private BatchImport lock(UUID w,UUID id) {
        var order=imports.locked(id,w).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy yêu cầu."));
        // A concurrent approval may have finished since this request prepared the order.
        entities.refresh(order);
        return order;
    }
    private static ResponseStatusException conflict(String msg){return new ResponseStatusException(HttpStatus.CONFLICT,msg);}
}
