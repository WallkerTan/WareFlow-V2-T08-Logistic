package com.example.inventory_service.service;

import com.example.inventory_service.dto.StockDocumentResponse;
import com.example.inventory_service.entity.*;
import com.example.inventory_service.entity.enums.*;
import com.example.inventory_service.repository.*;
import com.example.inventory_service.security.WarehouseAccessService.UserIdentity;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor
public class SalesReturnService {
    private final DeliveryReturnClient delivery;
    private final StockDocumentRepository documents;
    private final StockLotRepository lots;
    private final StockMovementRepository movements;

    @Transactional
    public StockDocumentResponse receive(String token,UUID warehouse,UUID shipment,StockLotStatus condition,String note,UserIdentity user) {
        if(condition!=StockLotStatus.OK && condition!=StockLotStatus.DAMAGED)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Tình trạng nhận hoàn phải là OK hoặc DAMAGED");
        var returned=delivery.requireReturned(token,warehouse,shipment);
        var sale=documents.findByIdAndWarehouseIdForUpdate(returned.documentId(),warehouse)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy phiếu xuất bán"));
        if(sale.getType()!=StockDocumentType.EXPORT_SALE || sale.getStatus()!=StockDocumentStatus.DONE)
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Phiếu nguồn chưa hoàn tất xuất bán");
        var audit=new LinkedHashMap<String,Object>(sale.getApproval()==null?Map.of():sale.getApproval());
        if(audit.get("returnReceiptId")!=null) {
            if(!shipment.toString().equals(audit.get("returnShipmentId")))
                throw new ResponseStatusException(HttpStatus.CONFLICT,"Phiếu bán đã nhận hoàn cho vận đơn khác");
            return StockDocumentResponse.from(documents.findByIdAndWarehouseId(UUID.fromString(audit.get("returnReceiptId").toString()),warehouse).orElseThrow());
        }
        var receipt=documents.saveAndFlush(StockDocument.builder().warehouseId(warehouse).type(StockDocumentType.RECEIPT)
                .status(StockDocumentStatus.DONE).createdBy(user.id()).lines(new ArrayList<>())
                .approval(new LinkedHashMap<>(Map.of("shipmentId",shipment.toString(),"saleId",sale.getId().toString(),"source","SALES_RETURN","condition",condition.name(),"note",note==null?"":note))).build());
        List<Map<String,Object>> lines=new ArrayList<>();int index=0;
        for(var line:sale.getLines().stream().sorted(Comparator.comparing(l->l.get("lotId").toString())).toList()) {
            var original=lots.findForUpdate(UUID.fromString(line.get("lotId").toString()),warehouse)
                    .orElseThrow(()->new ResponseStatusException(HttpStatus.CONFLICT,"Sản phẩm/lô nguồn đã ngừng sử dụng; cần khôi phục trước khi nhập hoàn"));
            var quantity=new BigDecimal(line.get("quantity").toString());
            var lot=lots.save(StockLot.builder().product(original.getProduct()).lotCode("RET-"+shipment+"-"+(++index))
                    .expiryDate(original.getExpiryDate()).quantity(quantity).reserved(BigDecimal.ZERO).status(condition).build());
            var row=new LinkedHashMap<String,Object>();row.put("productId",original.getProduct().getId().toString());row.put("sku",original.getProduct().getSku());
            row.put("lotId",lot.getId().toString());row.put("lotCode",lot.getLotCode());row.put("receivedQty",quantity);row.put("condition",condition.name());row.put("sourceLotId",original.getId().toString());lines.add(row);
            movements.save(StockMovement.builder().warehouseId(warehouse).product(original.getProduct()).lot(lot).documentType("SALES_RETURN")
                    .documentId(receipt.getId()).qtyChange(quantity).actorId(user.id()).note("Nhận hoàn vận đơn "+shipment).build());
        }
        receipt.setLines(lines);documents.save(receipt);
        audit.put("returnReceiptId",receipt.getId().toString());audit.put("returnShipmentId",shipment.toString());audit.put("returnAt",Instant.now().toString());
        sale.setApproval(audit);documents.save(sale);
        return StockDocumentResponse.from(receipt);
    }
}
