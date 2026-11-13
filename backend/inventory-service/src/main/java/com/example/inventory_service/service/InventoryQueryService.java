package com.example.inventory_service.service;
import com.example.inventory_service.entity.*;
import com.example.inventory_service.repository.*;
import com.example.inventory_service.dto.StockDocumentResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

@Service @RequiredArgsConstructor @Transactional(readOnly=true)
public class InventoryQueryService {
    private final StockMovementRepository movements;
    private final ProductRepository products;
    private final StockLotRepository lots;
    private final StockDocumentRepository documents;
    public record WarehouseSummary(long products, long lots, long pendingDocuments, Map<String,Long> alerts, Map<String,Long> documentsByStatus) {}
    public WarehouseSummary summary(UUID warehouse) {
        var catalog=products.findAll((r,q,c)->c.and(c.equal(r.get("warehouseId"),warehouse),c.isNull(r.get("deletedAt"))));
        long lotCount=catalog.stream().mapToLong(p->lots.findByProduct_IdAndDeletedAtIsNull(p.getId()).size()).sum();
        Map<String,Long> counts=new LinkedHashMap<>();
        for(var state:com.example.inventory_service.entity.enums.StockDocumentStatus.values())
            counts.put(state.name(),documents.count((r,q,c)->c.and(c.equal(r.get("warehouseId"),warehouse),c.equal(r.get("status"),state))));
        Map<String,Long> warnings=new LinkedHashMap<>();
        for(String type:List.of("LOW_STOCK","NEAR_EXPIRY","EXPIRED"))warnings.put(type,0L);
        for(var alert:alerts(warehouse))warnings.merge(alert.type(),1L,Long::sum);
        return new WarehouseSummary(catalog.size(),lotCount,counts.getOrDefault("PENDING_APPROVAL",0L),warnings,counts);
    }
    public Page<StockDocumentResponse> approvals(UUID warehouse,Pageable page){
        return documents.findAll((r,q,c)->c.and(c.equal(r.get("warehouseId"),warehouse),c.equal(r.get("status"),com.example.inventory_service.entity.enums.StockDocumentStatus.PENDING_APPROVAL)),page).map(StockDocumentResponse::from);
    }
    public record Movement(Long id,UUID warehouseId,UUID productId,String sku,UUID lotId,String lotCode,
                           String documentType,UUID documentId,BigDecimal qtyChange,UUID actorId,String note,Instant createdAt){
        static Movement of(StockMovement m){return new Movement(m.getId(),m.getWarehouseId(),m.getProduct().getId(),m.getProduct().getSku(),
                m.getLot()==null?null:m.getLot().getId(),m.getLot()==null?null:m.getLot().getLotCode(),m.getDocumentType(),m.getDocumentId(),m.getQtyChange(),m.getActorId(),m.getNote(),m.getCreatedAt());}
    }
    public Page<Movement> movements(UUID warehouse,UUID product,UUID lot,UUID actor,String type,Instant from,Instant to,Pageable page){
        if(from!=null&&to!=null&&from.isAfter(to))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Khoảng thời gian không hợp lệ");
        return movements.findAll((r,q,c)->{
            var p=new ArrayList<jakarta.persistence.criteria.Predicate>();p.add(c.equal(r.get("warehouseId"),warehouse));
            if(product!=null)p.add(c.equal(r.get("product").get("id"),product));if(lot!=null)p.add(c.equal(r.get("lot").get("id"),lot));
            if(actor!=null)p.add(c.equal(r.get("actorId"),actor));if(type!=null)p.add(c.equal(r.get("documentType"),type));
            if(from!=null)p.add(c.greaterThanOrEqualTo(r.get("createdAt"),from));if(to!=null)p.add(c.lessThan(r.get("createdAt"),to));
            return c.and(p.toArray(jakarta.persistence.criteria.Predicate[]::new));
        },page).map(Movement::of);
    }
    public record Alert(String type,UUID productId,String sku,UUID lotId,BigDecimal quantity,BigDecimal minimum,LocalDate expiryDate){}
    public List<Alert> alerts(UUID warehouse){
        List<Alert> result=new ArrayList<>();
        for(Product p:products.findAll((r,q,c)->c.and(c.equal(r.get("warehouseId"),warehouse),c.isNull(r.get("deletedAt"))))){
            BigDecimal available=BigDecimal.ZERO;
            for(StockLot l:lots.findByProduct_IdAndDeletedAtIsNull(p.getId())){
                boolean expired=l.getExpiryDate()!=null&&l.getExpiryDate().isBefore(LocalDate.now());
                if(!expired&&(l.getStatus()==com.example.inventory_service.entity.enums.StockLotStatus.OK||l.getStatus()==com.example.inventory_service.entity.enums.StockLotStatus.NEAR_EXPIRY))available=available.add(l.getQuantity().subtract(l.getReserved()));
                if(l.getQuantity().signum()>0&&l.getExpiryDate()!=null&&!l.getExpiryDate().isAfter(LocalDate.now().plusDays(30)))
                    result.add(new Alert(expired?"EXPIRED":"NEAR_EXPIRY",p.getId(),p.getSku(),l.getId(),l.getQuantity(),p.getMinStock(),l.getExpiryDate()));
            }
            if(p.getMinStock()!=null&&available.compareTo(p.getMinStock())<0)result.add(new Alert("LOW_STOCK",p.getId(),p.getSku(),null,available,p.getMinStock(),null));
        }
        return result;
    }
    public String print(UUID warehouse,UUID id){
        StockDocument d=documents.findByIdAndWarehouseId(id,warehouse).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy phiếu"));
        StringBuilder html=new StringBuilder("<!doctype html><html lang=\"vi\"><meta charset=\"utf-8\"><title>WareFlow</title><style>body{font:14px sans-serif;margin:32px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #aaa;padding:8px}</style><h1>WareFlow - ");
        html.append(escape(d.getType().name())).append("</h1><p>Mã phiếu: ").append(id).append("</p><p>Kho: ").append(warehouse).append("</p><p>Trạng thái: ").append(d.getStatus()).append("</p><table><tr><th>SKU</th><th>Lô</th><th>Số lượng</th></tr>");
        for(var line:d.getLines()){
            Object quantity=null;
            for(String field:List.of("quantity","receivedQty","qty","delta","countedQuantity"))if(line.containsKey(field)){quantity=line.get(field);break;}
            html.append("<tr><td>").append(escape(line.get("sku"))).append("</td><td>").append(escape(line.get("lotCode"))).append("</td><td>").append(escape(quantity)).append("</td></tr>");
        }
        return html.append("</table></html>").toString();
    }
    private String escape(Object v){return v==null?"":v.toString().replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace("\"","&quot;").replace("'","&#39;");}
}
