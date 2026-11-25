package com.example.inventory_service.service;

import com.example.inventory_service.dto.*;
import com.example.inventory_service.entity.*;
import com.example.inventory_service.entity.enums.*;
import com.example.inventory_service.repository.*;
import com.example.inventory_service.security.WarehouseAccessService.UserIdentity;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
public class StockOutboundService {
    private final StockDocumentRepository documents;
    private final StockLotRepository lots;
    private final ProductRepository products;
    private final StockMovementRepository movements;
    private static final Set<StockDocumentType> TYPES = EnumSet.of(StockDocumentType.EXPORT_SALE,
            StockDocumentType.EXPORT_TRANSFER, StockDocumentType.EXPORT_DESTROY, StockDocumentType.EXPORT_RETURN);

    public StockDocumentResponse create(UUID warehouseId, CreateExportRequest request, UserIdentity user) {
        if (request.type() == null || !TYPES.contains(request.type())) bad("Invalid export type");
        var document = StockDocument.builder().warehouseId(warehouseId).type(request.type())
                .status(StockDocumentStatus.DRAFT).createdBy(user.id()).build();
        fillDraft(document, request);
        return StockDocumentResponse.from(documents.save(document));
    }

    public StockDocumentResponse updateSaleDraft(UUID warehouseId, UUID id, CreateExportRequest request) {
        var document = lockedExport(warehouseId, id);
        requireStatus(document.getStatus(), StockDocumentStatus.DRAFT);
        if (document.getType() != StockDocumentType.EXPORT_SALE || request.type() != document.getType()) {
            bad("Chỉ chỉnh sửa được phiếu xuất bán đang ở trạng thái nháp.");
        }
        fillDraft(document, request);
        return StockDocumentResponse.from(documents.save(document));
    }

    private void fillDraft(StockDocument document, CreateExportRequest request) {
        UUID warehouseId = document.getWarehouseId();
        boolean transfer = request.type() == StockDocumentType.EXPORT_TRANSFER;
        if (transfer && (request.targetWarehouseId() == null || warehouseId.equals(request.targetWarehouseId())))
            bad("Transfer requires a different destination warehouse");
        if (!transfer && request.targetWarehouseId() != null) bad("Only transfers can specify a destination warehouse");
        boolean sale=request.type()==StockDocumentType.EXPORT_SALE;
        if (request.lines() == null || (!sale && request.lines().isEmpty())) bad("Phiếu cần ít nhất một dòng hàng.");
        boolean returning=request.type()==StockDocumentType.EXPORT_RETURN;
        BigDecimal total=BigDecimal.ZERO;
        UUID supplier=null, batch=null;
        if (sale && !request.lines().isEmpty()) {
            validateRecipient(request.recipientName(), request.recipientPhone(), request.recipientAddress());
        }
        Set<UUID> seen = new HashSet<>();
        List<Map<String, Object>> lines = new ArrayList<>();
        var allocated = allocateLines(warehouseId, request.lines(), sale);
        for (var allocation : allocated.stream().sorted(Comparator.comparing(item -> item.line().lotId())).toList()) {
            var line = allocation.line();
            if (!seen.add(line.lotId())) bad("Duplicate lot in export");
            if (line.quantity() == null || line.quantity().signum() <= 0) bad("Quantity must be positive");
            StockLot lot = lot(warehouseId, line.lotId());
            validateCondition(lot, request.type());
            if (lot.getQuantity().subtract(lot.getReserved()).compareTo(line.quantity()) < 0) conflict("Insufficient available stock");
            if (transfer && line.targetProductId()!=null) target(request.targetWarehouseId(), line.targetProductId(), lot.getProduct());
            else if (line.targetProductId() != null) bad("Only transfers can specify target products");
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("lotId", lot.getId().toString());
            data.put("productId", lot.getProduct().getId().toString());
            data.put("sku", lot.getProduct().getSku());
            if (sale) data.put("productName", lot.getProduct().getName());
            if (allocation.saleLine() != null) data.put("saleLine", allocation.saleLine());
            data.put("lotCode", lot.getLotCode());
            data.put("quantity", line.quantity());
            if(sale || returning) {
                if(lot.getUnitCost()==null) conflict("Lô chưa có giá nhập đã đối soát.");
                var percent=sale && line.pricePercent()!=null?line.pricePercent():new BigDecimal("100");
                BigDecimal unitPrice=lot.getUnitCost().multiply(percent).movePointLeft(2).setScale(2,java.math.RoundingMode.HALF_UP);
                var amount=unitPrice.multiply(line.quantity()).setScale(2,java.math.RoundingMode.HALF_UP);
                data.put("price",unitPrice);data.put("pricePercent",percent);data.put("amount",amount);
                total=total.add(amount);
                if(returning) {
                    if(lot.getPurchaseBatchId()==null || lot.getSupplierId()==null) conflict("Lô chưa có nguồn nhập đã đối soát.");
                    if(batch!=null && (!batch.equals(lot.getPurchaseBatchId()) || !supplier.equals(lot.getSupplierId()))) bad("Mỗi phiếu hoàn phải cùng lô nhập và nhà cung cấp.");
                    batch=lot.getPurchaseBatchId();supplier=lot.getSupplierId();
                }
            }
            if (transfer && line.targetProductId()!=null) data.put("targetProductId", line.targetProductId().toString());
            lines.add(data);
        }
        Map<String, Object> audit = new LinkedHashMap<>();
        if(returning && total.compareTo(new BigDecimal("10000000"))<0) bad("Giá trị thực hoàn phải từ 10 triệu đồng.");
        if(sale || returning) audit.put("total",total);
        if (sale) {
            audit.put("recipientName", request.recipientName());
            audit.put("recipientPhone", request.recipientPhone());
            audit.put("recipientAddress", request.recipientAddress());
        }
        if (request.note() != null) audit.put("note", request.note());
        document.setTargetWarehouseId(request.targetWarehouseId());
        document.setLines(lines);
        document.setApproval(audit);
    }

    private record Allocation(CreateExportRequest.Line line, Integer saleLine) {}

    private List<Allocation> allocateLines(UUID warehouse, List<CreateExportRequest.Line> requested, boolean sale) {
        var allocations = new ArrayList<Allocation>();
        var productsSelected = new HashSet<UUID>();
        for (int index = 0; index < requested.size(); index++) {
            var line = requested.get(index);
            if (line.productId() == null) {
                if (line.lotId() == null) bad("Chọn lô xuất cho dòng hàng.");
                allocations.add(new Allocation(line, null));
                continue;
            }
            if (!sale || line.lotId() != null || line.targetProductId() != null) {
                bad("Chỉ phiếu xuất bán hỗ trợ chọn sản phẩm theo SKU.");
            }
            if (line.quantity() == null || line.quantity().signum() <= 0) bad("Số lượng phải lớn hơn 0.");
            if (!productsSelected.add(line.productId())) bad("Mỗi SKU chỉ xuất hiện một lần trên phiếu.");
            var product = products.findByIdAndWarehouseIdAndDeletedAtIsNull(line.productId(), warehouse)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sản phẩm không có trong kho xuất."));
            BigDecimal remaining = line.quantity();
            LocalDate today = LocalDate.now();
            var eligible = lots.findByProduct_IdAndDeletedAtIsNull(product.getId()).stream()
                    .filter(lot -> lot.getUnitCost() != null && lot.getStatus() != StockLotStatus.DAMAGED
                            && lot.getStatus() != StockLotStatus.EXPIRED
                            && (lot.getExpiryDate() == null || !lot.getExpiryDate().isBefore(today)))
                    .sorted(Comparator.comparing(StockLot::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                            .thenComparing(StockLot::getId))
                    .toList();
            for (var lot : eligible) {
                BigDecimal quantity = remaining.min(lot.getQuantity().subtract(lot.getReserved()));
                if (quantity.signum() <= 0) continue;
                allocations.add(new Allocation(new CreateExportRequest.Line(lot.getId(), quantity, null, line.pricePercent()), index));
                remaining = remaining.subtract(quantity);
                if (remaining.signum() == 0) break;
            }
            if (remaining.signum() > 0) conflict("SKU " + product.getSku() + " thiếu tồn khả dụng có giá nhập.");
        }
        return allocations;
    }

    public StockDocumentResponse transition(UUID warehouseId, UUID id, String action, String note, UserIdentity user) {
        StockDocument doc = lockedExport(warehouseId, id);
        StockDocumentStatus status = doc.getStatus();
        switch (action) {
            case "submit" -> {
                requireStatus(status, StockDocumentStatus.DRAFT);
                if (doc.getLines().isEmpty()) bad("Thêm ít nhất một dòng hàng trước khi gửi duyệt.");
                if (doc.getType() == StockDocumentType.EXPORT_SALE) {
                    var details = doc.getApproval();
                    validateRecipient((String) details.get("recipientName"), (String) details.get("recipientPhone"),
                            (String) details.get("recipientAddress"));
                }
                doc.setStatus(StockDocumentStatus.PENDING_APPROVAL);
            }
            case "approve" -> {
                requireStatus(status, StockDocumentStatus.PENDING_APPROVAL);
                changeStock(doc, user, false, false);
                doc.setStatus(StockDocumentStatus.APPROVED);
            }
            case "complete" -> {
                if (status == StockDocumentStatus.DONE) return StockDocumentResponse.from(doc);
                requireStatus(status, StockDocumentStatus.APPROVED);
                changeStock(doc, user, true, false);
                doc.setStatus(StockDocumentStatus.DONE);
            }
            case "reject", "cancel" -> {
                if (status == StockDocumentStatus.DONE || status == StockDocumentStatus.CANCELLED) conflict("Export is already closed");
                if (action.equals("reject")) requireStatus(status, StockDocumentStatus.PENDING_APPROVAL);
                if (status == StockDocumentStatus.APPROVED) changeStock(doc, user, false, true);
                doc.setStatus(StockDocumentStatus.CANCELLED);
            }
            default -> bad("Unknown action");
        }
        Map<String, Object> audit = new LinkedHashMap<>(doc.getApproval());
        audit.put(action + "By", user.id().toString());
        audit.put(action + "At", Instant.now().toString());
        if (note != null) audit.put(action + "Note", note);
        doc.setApproval(audit);
        return StockDocumentResponse.from(documents.save(doc));
    }

    private void changeStock(StockDocument doc, UserIdentity user, boolean complete, boolean cancel) {
        for (var line : doc.getLines().stream().sorted(Comparator.comparing(l -> l.get("lotId").toString())).toList()) {
            StockLot lot = lot(doc.getWarehouseId(), UUID.fromString(line.get("lotId").toString()));
            BigDecimal qty = new BigDecimal(line.get("quantity").toString());
            if (!cancel) validateCondition(lot, doc.getType());
            if (!complete && !cancel) {
                if (lot.getQuantity().subtract(lot.getReserved()).compareTo(qty) < 0) conflict("Insufficient available stock");
                lot.setReserved(lot.getReserved().add(qty));
            } else {
                if (lot.getReserved().compareTo(qty) < 0) conflict("Reserved stock is inconsistent");
                lot.setReserved(lot.getReserved().subtract(qty));
                if (complete) {
                    if (lot.getQuantity().compareTo(qty) < 0) conflict("Insufficient stock");
                    lot.setQuantity(lot.getQuantity().subtract(qty));
                    movement(doc, lot, qty.negate(), user);
                    if (doc.getType() == StockDocumentType.EXPORT_TRANSFER) {
                        Product product = target(doc.getTargetWarehouseId(), line.get("targetProductId")==null?null:UUID.fromString(line.get("targetProductId").toString()), lot.getProduct());
                        // A separate receiving lot preserves provenance and avoids merging unrelated batches.
                        StockLot received = lots.save(StockLot.builder().product(product)
                                .lotCode("TR-" + doc.getId() + "-" + lot.getId())
                                .purchaseBatchId(lot.getPurchaseBatchId()).supplierId(lot.getSupplierId()).unitCost(lot.getUnitCost())
                                .expiryDate(lot.getExpiryDate()).quantity(qty).reserved(BigDecimal.ZERO).status(lot.getStatus()).build());
                        line.put("targetLotId", received.getId().toString());
                        movement(doc, received, qty, user);
                    }
                }
            }
            lots.save(lot);
        }
    }

    private void movement(StockDocument doc, StockLot lot, BigDecimal qty, UserIdentity user) {
        movements.save(StockMovement.builder().warehouseId(lot.getProduct().getWarehouseId()).product(lot.getProduct())
                .lot(lot).documentType(doc.getType().name()).documentId(doc.getId()).qtyChange(qty)
                .actorId(user.id()).note("Export " + doc.getId()).build());
    }

    private Product target(UUID warehouseId, UUID productId, Product source) {
        if(productId==null) {
            var match=products.findByWarehouseIdAndSkuIgnoreCaseAndDeletedAtIsNull(warehouseId,source.getSku());
            if(match.isEmpty()) return products.save(Product.builder().warehouseId(warehouseId).sku(source.getSku()).name(source.getName())
                .unit(source.getUnit()).barcode(source.getBarcode()).images(source.getImages()).minStock(source.getMinStock()).build());
            productId=match.get().getId();
        }
        Product product = products.findByIdAndWarehouseIdAndDeletedAtIsNull(productId, warehouseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Destination product not found"));
        if (!source.getSku().equalsIgnoreCase(product.getSku()) || !Objects.equals(source.getUnit(), product.getUnit()))
            bad("Source and destination products must have the same SKU and unit");
        return product;
    }

    private StockLot lot(UUID warehouseId, UUID id) {
        return lots.findForUpdate(id, warehouseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Active lot not found in warehouse"));
    }

    private void validateCondition(StockLot lot, StockDocumentType type) {
        if (type == StockDocumentType.EXPORT_DESTROY || type == StockDocumentType.EXPORT_RETURN) return;
        if (lot.getStatus() == StockLotStatus.EXPIRED || lot.getStatus() == StockLotStatus.DAMAGED
                || (lot.getExpiryDate() != null && lot.getExpiryDate().isBefore(LocalDate.now())))
            conflict("Cannot sell or transfer expired or damaged stock");
    }

    @Transactional(readOnly = true)
    public StockDocumentResponse get(UUID warehouseId, UUID id) {
        StockDocument doc = documents.findByIdAndWarehouseId(id, warehouseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Export not found"));
        requireExport(doc);
        return StockDocumentResponse.from(doc);
    }

    @Transactional(readOnly = true)
    public Page<StockDocumentResponse> list(UUID warehouseId, StockDocumentType type, StockDocumentStatus status, Pageable pageable) {
        if (type != null && !TYPES.contains(type)) bad("Invalid export type");
        return documents.findAll((root, query, cb) -> {
            var predicates = new ArrayList<jakarta.persistence.criteria.Predicate>();
            predicates.add(cb.equal(root.get("warehouseId"), warehouseId));
            predicates.add(type == null ? root.get("type").in(TYPES) : cb.equal(root.get("type"), type));
            if (status != null) predicates.add(cb.equal(root.get("status"), status));
            return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        }, pageable).map(StockDocumentResponse::from);
    }

    private StockDocument lockedExport(UUID warehouseId, UUID id) {
        var document = documents.findByIdAndWarehouseIdForUpdate(id, warehouseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Export not found"));
        requireExport(document);
        return document;
    }

    private void validateRecipient(String name, String phone, String address) {
        if (blank(name) || blank(address) || blank(phone) || !phone.matches("(?:0|[+]84)[0-9]{8,10}")) {
            bad("Thông tin người nhận chưa hợp lệ.");
        }
    }

    private void requireExport(StockDocument doc) {
        if (!TYPES.contains(doc.getType())) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Export not found");
    }
    private void requireStatus(StockDocumentStatus actual, StockDocumentStatus expected) {
        if (actual != expected) conflict("Expected status " + expected + ", got " + actual);
    }
    private static boolean blank(String s){return s==null || s.isBlank();}
    private void bad(String message) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
    private void conflict(String message) { throw new ResponseStatusException(HttpStatus.CONFLICT, message); }
}
