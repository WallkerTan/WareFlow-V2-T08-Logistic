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
        boolean transfer = request.type() == StockDocumentType.EXPORT_TRANSFER;
        if (transfer && (request.targetWarehouseId() == null || warehouseId.equals(request.targetWarehouseId())))
            bad("Transfer requires a different destination warehouse");
        if (!transfer && request.targetWarehouseId() != null) bad("Only transfers can specify a destination warehouse");
        if (request.lines() == null || request.lines().isEmpty()) bad("At least one line is required");
        Set<UUID> seen = new HashSet<>();
        List<Map<String, Object>> lines = new ArrayList<>();
        for (var line : request.lines().stream().sorted(Comparator.comparing(l -> l.lotId().toString())).toList()) {
            if (!seen.add(line.lotId())) bad("Duplicate lot in export");
            if (line.quantity() == null || line.quantity().signum() <= 0) bad("Quantity must be positive");
            StockLot lot = lot(warehouseId, line.lotId());
            validateCondition(lot, request.type());
            if (lot.getQuantity().subtract(lot.getReserved()).compareTo(line.quantity()) < 0) conflict("Insufficient available stock");
            if (transfer) target(request.targetWarehouseId(), line.targetProductId(), lot.getProduct());
            else if (line.targetProductId() != null) bad("Only transfers can specify target products");
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("lotId", lot.getId().toString());
            data.put("productId", lot.getProduct().getId().toString());
            data.put("sku", lot.getProduct().getSku());
            data.put("lotCode", lot.getLotCode());
            data.put("quantity", line.quantity());
            if (transfer) data.put("targetProductId", line.targetProductId().toString());
            lines.add(data);
        }
        Map<String, Object> audit = new LinkedHashMap<>();
        if (request.note() != null) audit.put("note", request.note());
        return StockDocumentResponse.from(documents.save(StockDocument.builder().warehouseId(warehouseId)
                .targetWarehouseId(request.targetWarehouseId()).type(request.type()).status(StockDocumentStatus.DRAFT)
                .createdBy(user.id()).lines(lines).approval(audit).build()));
    }

    public StockDocumentResponse transition(UUID warehouseId, UUID id, String action, String note, UserIdentity user) {
        StockDocument doc = documents.findByIdAndWarehouseIdForUpdate(id, warehouseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Export not found"));
        requireExport(doc);
        StockDocumentStatus status = doc.getStatus();
        switch (action) {
            case "submit" -> {
                requireStatus(status, StockDocumentStatus.DRAFT);
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
                if (doc.getType() == StockDocumentType.EXPORT_SALE && !doc.getApproval().containsKey("packAt"))
                    conflict("Đơn bán hàng phải lấy hàng và đóng gói trước khi hoàn tất");
                changeStock(doc, user, true, false);
                doc.setStatus(StockDocumentStatus.DONE);
            }
            case "pick", "pack" -> {
                requireStatus(status, StockDocumentStatus.APPROVED);
                if (action.equals("pack") && !doc.getApproval().containsKey("pickAt")) conflict("Phải lấy hàng trước khi đóng gói");
                if (doc.getApproval().containsKey(action + "At")) return StockDocumentResponse.from(doc);
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
                        Product product = target(doc.getTargetWarehouseId(), UUID.fromString(line.get("targetProductId").toString()), lot.getProduct());
                        // A separate receiving lot preserves provenance and avoids merging unrelated batches.
                        StockLot received = lots.save(StockLot.builder().product(product)
                                .lotCode("TR-" + doc.getId() + "-" + lot.getId())
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
        if (productId == null) bad("Transfer line requires targetProductId");
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

    private void requireExport(StockDocument doc) {
        if (!TYPES.contains(doc.getType())) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Export not found");
    }
    private void requireStatus(StockDocumentStatus actual, StockDocumentStatus expected) {
        if (actual != expected) conflict("Expected status " + expected + ", got " + actual);
    }
    private void bad(String message) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
    private void conflict(String message) { throw new ResponseStatusException(HttpStatus.CONFLICT, message); }
}
