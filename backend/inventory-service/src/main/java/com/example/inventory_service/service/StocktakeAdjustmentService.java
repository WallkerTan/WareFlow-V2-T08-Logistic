package com.example.inventory_service.service;

import com.example.inventory_service.dto.*;
import com.example.inventory_service.entity.*;
import com.example.inventory_service.entity.enums.*;
import com.example.inventory_service.repository.*;
import com.example.inventory_service.security.WarehouseAccessService.UserIdentity;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
public class StocktakeAdjustmentService {
    private final StockDocumentRepository documents;
    private final StockLotRepository lots;
    private final ProductRepository products;
    private final StockMovementRepository movements;

    public StockDocumentResponse createStocktake(UUID warehouseId, CreateStocktakeRequest request, UserIdentity user) {
        Set<String> seen = new HashSet<>();
        List<Map<String, Object>> lines = new ArrayList<>();
        for (var input : request.lines()) {
            Product product = products.findByIdAndWarehouseIdAndDeletedAtIsNull(input.productId(), warehouseId)
                    .orElseThrow(() -> notFound("Product not found in warehouse"));
            String key = input.lotId() == null ? "product:" + product.getId() : "lot:" + input.lotId();
            if (!seen.add(key)) bad("Duplicate product or lot in stocktake");
            BigDecimal systemQuantity;
            Map<String, Object> line = new LinkedHashMap<>();
            line.put("productId", product.getId().toString());
            line.put("sku", product.getSku());
            if (input.lotId() != null) {
                StockLot lot = lot(warehouseId, input.lotId());
                if (!lot.getProduct().getId().equals(product.getId())) bad("Lot does not belong to product");
                systemQuantity = lot.getQuantity();
                line.put("lotId", lot.getId().toString());
                line.put("lotCode", lot.getLotCode());
            } else {
                systemQuantity = lots.sumQuantity(product.getId());
            }
            line.put("systemQuantity", systemQuantity);
            line.put("countedQuantity", input.countedQuantity());
            line.put("variance", input.countedQuantity().subtract(systemQuantity));
            line.put("countLevel", input.lotId() == null ? "PRODUCT" : "LOT");
            lines.add(line);
        }
        Map<String, Object> audit = new LinkedHashMap<>();
        if (request.note() != null) audit.put("note", request.note());
        return StockDocumentResponse.from(documents.save(StockDocument.builder().warehouseId(warehouseId)
                .type(StockDocumentType.STOCKTAKE).status(StockDocumentStatus.DRAFT).createdBy(user.id())
                .lines(lines).approval(audit).build()));
    }

    public StockDocumentResponse createAdjustment(UUID warehouseId, CreateAdjustmentRequest request, UserIdentity user) {
        Set<UUID> seen = new HashSet<>();
        List<Map<String, Object>> lines = new ArrayList<>();
        for (var input : request.lines().stream().sorted(Comparator.comparing(l -> l.lotId().toString())).toList()) {
            if (!seen.add(input.lotId())) bad("Duplicate lot in adjustment");
            StockLot lot = lot(warehouseId, input.lotId());
            Map<String, Object> line = new LinkedHashMap<>();
            line.put("lotId", lot.getId().toString()); line.put("productId", lot.getProduct().getId().toString());
            line.put("sku", lot.getProduct().getSku()); line.put("lotCode", lot.getLotCode()); line.put("delta", input.delta());
            lines.add(line);
        }
        Map<String, Object> audit = new LinkedHashMap<>();
        if (request.note() != null) audit.put("note", request.note());
        return StockDocumentResponse.from(documents.save(StockDocument.builder().warehouseId(warehouseId)
                .type(StockDocumentType.ADJUST).status(StockDocumentStatus.DRAFT).createdBy(user.id())
                .lines(lines).approval(audit).build()));
    }

    public StockDocumentResponse transition(UUID warehouseId, UUID id, StockDocumentType type, String action,
                                             String note, UserIdentity user) {
        StockDocument doc = documents.findByIdAndWarehouseIdForUpdate(id, warehouseId)
                .orElseThrow(() -> notFound("Document not found"));
        requireType(doc, type);
        switch (action) {
            case "submit" -> { requireStatus(doc, StockDocumentStatus.DRAFT); doc.setStatus(StockDocumentStatus.PENDING_APPROVAL); }
            case "approve" -> { requireStatus(doc, StockDocumentStatus.PENDING_APPROVAL); doc.setStatus(StockDocumentStatus.APPROVED); }
            case "complete" -> {
                if (doc.getStatus() == StockDocumentStatus.DONE) return StockDocumentResponse.from(doc);
                requireStatus(doc, StockDocumentStatus.APPROVED);
                if (type == StockDocumentType.ADJUST) applyAdjustment(doc, user);
                doc.setStatus(StockDocumentStatus.DONE);
            }
            case "reject" -> { requireStatus(doc, StockDocumentStatus.PENDING_APPROVAL); doc.setStatus(StockDocumentStatus.CANCELLED); }
            case "cancel" -> {
                if (doc.getStatus() == StockDocumentStatus.DONE || doc.getStatus() == StockDocumentStatus.CANCELLED) conflict("Document is already closed");
                doc.setStatus(StockDocumentStatus.CANCELLED);
            }
            default -> bad("Unknown action");
        }
        Map<String, Object> audit = new LinkedHashMap<>(doc.getApproval() == null ? Map.of() : doc.getApproval());
        audit.put(action + "By", user.id().toString()); audit.put(action + "At", Instant.now().toString());
        if (note != null) audit.put(action + "Note", note);
        doc.setApproval(audit);
        return StockDocumentResponse.from(documents.save(doc));
    }

    private void applyAdjustment(StockDocument doc, UserIdentity user) {
        List<Map<String, Object>> ordered = doc.getLines().stream().sorted(Comparator.comparing(l -> l.get("lotId").toString())).toList();
        for (var line : ordered) {
            StockLot lot = lot(doc.getWarehouseId(), UUID.fromString(line.get("lotId").toString()));
            BigDecimal delta = new BigDecimal(line.get("delta").toString());
            if (delta.signum() < 0 && lot.getQuantity().add(delta).compareTo(lot.getReserved()) < 0)
                conflict("Adjustment cannot reduce stock below reserved quantity");
        }
        for (var line : ordered) {
            StockLot lot = lot(doc.getWarehouseId(), UUID.fromString(line.get("lotId").toString()));
            BigDecimal delta = new BigDecimal(line.get("delta").toString());
            lot.setQuantity(lot.getQuantity().add(delta)); lots.save(lot);
            if (delta.signum() != 0) movements.save(StockMovement.builder().warehouseId(doc.getWarehouseId())
                    .product(lot.getProduct()).lot(lot).documentType(doc.getType().name()).documentId(doc.getId())
                    .qtyChange(delta).actorId(user.id()).note("Adjustment " + doc.getId()).build());
        }
    }

    @Transactional(readOnly = true)
    public StockDocumentResponse get(UUID warehouseId, UUID id, StockDocumentType type) {
        StockDocument doc = documents.findByIdAndWarehouseId(id, warehouseId).orElseThrow(() -> notFound("Document not found"));
        requireType(doc, type); return StockDocumentResponse.from(doc);
    }

    @Transactional(readOnly = true)
    public Page<StockDocumentResponse> list(UUID warehouseId, StockDocumentType type, StockDocumentStatus status, Pageable pageable) {
        return documents.findAll((root, query, cb) -> {
            var predicates = new ArrayList<jakarta.persistence.criteria.Predicate>();
            predicates.add(cb.equal(root.get("warehouseId"), warehouseId)); predicates.add(cb.equal(root.get("type"), type));
            if (status != null) predicates.add(cb.equal(root.get("status"), status));
            return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        }, pageable).map(StockDocumentResponse::from);
    }

    private StockLot lot(UUID warehouseId, UUID id) { return lots.findForUpdate(id, warehouseId).orElseThrow(() -> notFound("Active lot not found in warehouse")); }
    private void requireType(StockDocument doc, StockDocumentType type) { if (doc.getType() != type) throw notFound("Document not found"); }
    private void requireStatus(StockDocument doc, StockDocumentStatus expected) { if (doc.getStatus() != expected) conflict("Expected status " + expected + ", got " + doc.getStatus()); }
    private ResponseStatusException notFound(String message) { return new ResponseStatusException(HttpStatus.NOT_FOUND, message); }
    private void bad(String message) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
    private void conflict(String message) { throw new ResponseStatusException(HttpStatus.CONFLICT, message); }
}
