package com.example.inventory_service.service;

import com.example.inventory_service.dto.*;
import com.example.inventory_service.entity.Product;
import com.example.inventory_service.entity.StockDocument;
import com.example.inventory_service.entity.StockLot;
import com.example.inventory_service.entity.StockMovement;
import com.example.inventory_service.entity.enums.StockDocumentStatus;
import com.example.inventory_service.entity.enums.StockDocumentType;
import com.example.inventory_service.entity.enums.StockLotStatus;
import com.example.inventory_service.repository.ProductRepository;
import com.example.inventory_service.repository.StockDocumentRepository;
import com.example.inventory_service.repository.StockLotRepository;
import com.example.inventory_service.repository.StockMovementRepository;
import com.example.inventory_service.security.WarehouseAccessService.UserIdentity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockInboundService {

    private final StockDocumentRepository documentRepository;
    private final ProductRepository productRepository;
    private final StockLotRepository lotRepository;
    private final StockMovementRepository movementRepository;

    /** Ngưỡng chi tiêu lớn để yêu cầu phê duyệt cấp công ty (mục 2.8) - Mặc định 20.000.000 VNĐ */
    @Value("${wareflow.approval.large-spending-threshold:20000000}")
    private BigDecimal largeSpendingThreshold = new BigDecimal("20000000");

    // ─────────────────────────────────────────────────────────────────────────
    // 1. PO: TẠO ĐƠN ĐẶT HÀNG
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public StockDocumentResponse createPurchaseOrder(UUID warehouseId, CreatePurchaseOrderRequest request, UserIdentity user) {
        if (request.lines() == null || request.lines().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn đặt hàng phải có ít nhất 1 dòng mặt hàng");
        }

        List<Map<String, Object>> lines = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (PurchaseOrderLineRequest lineReq : request.lines()) {
            Product product = productRepository.findByIdAndWarehouseIdAndDeletedAtIsNull(lineReq.productId(), warehouseId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Không tìm thấy sản phẩm id=" + lineReq.productId() + " trong kho"));

            BigDecimal lineTotal = lineReq.qty().multiply(lineReq.price());
            totalAmount = totalAmount.add(lineTotal);

            Map<String, Object> line = new LinkedHashMap<>();
            line.put("productId", product.getId().toString());
            line.put("productName", product.getName());
            line.put("sku", product.getSku());
            line.put("unit", product.getUnit());
            line.put("qty", lineReq.qty());
            line.put("price", lineReq.price());
            line.put("totalPrice", lineTotal);
            line.put("receivedQty", BigDecimal.ZERO);
            if (lineReq.note() != null && !lineReq.note().isBlank()) {
                line.put("note", lineReq.note().trim());
            }
            lines.add(line);
        }

        boolean isLargeSpending = totalAmount.compareTo(largeSpendingThreshold) >= 0;

        Map<String, Object> approval = new LinkedHashMap<>();
        approval.put("totalAmount", totalAmount);
        approval.put("largeSpendingThreshold", largeSpendingThreshold);
        approval.put("isLargeSpending", isLargeSpending);
        if (request.supplierName() != null && !request.supplierName().isBlank()) {
            approval.put("supplierName", request.supplierName().trim());
        }
        if (request.supplierId() != null) {
            approval.put("supplierId", request.supplierId().toString());
        }
        if (request.expectedDeliveryDate() != null) {
            approval.put("expectedDeliveryDate", request.expectedDeliveryDate().toString());
        }
        if (request.note() != null && !request.note().isBlank()) {
            approval.put("note", request.note().trim());
        }

        StockDocumentStatus initialStatus = StockDocumentStatus.DRAFT;

        if (Boolean.TRUE.equals(request.submitImmediately())) {
            initialStatus = determineSubmittedStatus(isLargeSpending, user, approval, totalAmount);
        }

        StockDocument po = StockDocument.builder()
                .warehouseId(warehouseId)
                .type(StockDocumentType.PO)
                .status(initialStatus)
                .lines(lines)
                .approval(approval)
                .createdBy(user.id())
                .build();

        StockDocument saved = documentRepository.save(po);
        log.info("Tạo đơn đặt hàng PO id={} kho={} status={} totalAmount={}", saved.getId(), warehouseId, saved.getStatus(), totalAmount);
        return StockDocumentResponse.from(saved);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. PO: CẬP NHẬT ĐƠN KHI Ở TRẠNG THÁI DRAFT
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public StockDocumentResponse updatePurchaseOrder(UUID warehouseId, UUID poId, CreatePurchaseOrderRequest request, UserIdentity user) {
        StockDocument po = getPo(warehouseId, poId);
        if (po.getStatus() != StockDocumentStatus.DRAFT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Chỉ có thể chỉnh sửa PO khi ở trạng thái DRAFT");
        }

        List<Map<String, Object>> lines = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (PurchaseOrderLineRequest lineReq : request.lines()) {
            Product product = productRepository.findByIdAndWarehouseIdAndDeletedAtIsNull(lineReq.productId(), warehouseId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Không tìm thấy sản phẩm id=" + lineReq.productId() + " trong kho"));

            BigDecimal lineTotal = lineReq.qty().multiply(lineReq.price());
            totalAmount = totalAmount.add(lineTotal);

            Map<String, Object> line = new LinkedHashMap<>();
            line.put("productId", product.getId().toString());
            line.put("productName", product.getName());
            line.put("sku", product.getSku());
            line.put("unit", product.getUnit());
            line.put("qty", lineReq.qty());
            line.put("price", lineReq.price());
            line.put("totalPrice", lineTotal);
            line.put("receivedQty", BigDecimal.ZERO);
            if (lineReq.note() != null && !lineReq.note().isBlank()) {
                line.put("note", lineReq.note().trim());
            }
            lines.add(line);
        }

        boolean isLargeSpending = totalAmount.compareTo(largeSpendingThreshold) >= 0;

        Map<String, Object> approval = po.getApproval() != null ? new LinkedHashMap<>(po.getApproval()) : new LinkedHashMap<>();
        approval.put("totalAmount", totalAmount);
        approval.put("isLargeSpending", isLargeSpending);
        if (request.supplierName() != null) approval.put("supplierName", request.supplierName().trim());
        if (request.supplierId() != null) approval.put("supplierId", request.supplierId().toString());
        if (request.expectedDeliveryDate() != null) approval.put("expectedDeliveryDate", request.expectedDeliveryDate().toString());
        if (request.note() != null) approval.put("note", request.note().trim());

        po.setLines(lines);
        po.setApproval(approval);

        if (Boolean.TRUE.equals(request.submitImmediately())) {
            po.setStatus(determineSubmittedStatus(isLargeSpending, user, approval, totalAmount));
        }

        return StockDocumentResponse.from(documentRepository.save(po));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. PO: GỬI DUYỆT (DRAFT → PENDING_APPROVAL)
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public StockDocumentResponse submitPurchaseOrder(UUID warehouseId, UUID poId, UserIdentity user) {
        StockDocument po = getPo(warehouseId, poId);
        if (po.getStatus() != StockDocumentStatus.DRAFT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Chỉ có thể gửi duyệt đơn ở trạng thái DRAFT");
        }

        Map<String, Object> approval = po.getApproval() != null ? new LinkedHashMap<>(po.getApproval()) : new LinkedHashMap<>();
        BigDecimal totalAmount = getPoTotalAmount(po);
        boolean isLargeSpending = totalAmount.compareTo(largeSpendingThreshold) >= 0;

        StockDocumentStatus nextStatus = determineSubmittedStatus(isLargeSpending, user, approval, totalAmount);
        po.setStatus(nextStatus);
        po.setApproval(approval);

        log.info("PO id={} đã gửi duyệt, status={}", poId, nextStatus);
        return StockDocumentResponse.from(documentRepository.save(po));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. PO: PHÊ DUYỆT ĐƠN ĐẶT HÀNG (PENDING_APPROVAL → APPROVED)
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public StockDocumentResponse approvePurchaseOrder(UUID warehouseId, UUID poId, String note, UserIdentity user) {
        StockDocument po = getPo(warehouseId, poId);
        if (po.getStatus() != StockDocumentStatus.PENDING_APPROVAL) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Chỉ có thể duyệt đơn đang ở trạng thái PENDING_APPROVAL");
        }

        Map<String, Object> approval = po.getApproval() != null ? new LinkedHashMap<>(po.getApproval()) : new LinkedHashMap<>();
        boolean isLargeSpending = Boolean.TRUE.equals(approval.get("isLargeSpending"));

        // Mục 2.8: Nếu chi tiêu lớn, bắt buộc phải do trung tâm phê duyệt công ty (COMPANY_ADMIN) duyệt
        if (isLargeSpending && !"COMPANY_ADMIN".equals(user.role()) && !"SYSTEM_ADMIN".equals(user.role())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Đơn đặt hàng có chi tiêu lớn (>= " + largeSpendingThreshold + " VNĐ), bắt buộc phải qua trung tâm phê duyệt công ty (COMPANY_ADMIN)");
        }

        po.setStatus(StockDocumentStatus.APPROVED);

        approval.put("approvedBy", user.id().toString());
        approval.put("approvedRole", user.role());
        approval.put("approvedAt", Instant.now().toString());
        approval.put("approvalStatus", "APPROVED");
        if (note != null && !note.isBlank()) {
            approval.put("approvalNote", note.trim());
        }
        po.setApproval(approval);

        log.info("PO id={} đã được duyệt bởi user={} role={}", poId, user.id(), user.role());
        return StockDocumentResponse.from(documentRepository.save(po));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. PO: TỪ CHỐI / HỦY ĐƠN ĐẶT HÀNG
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public StockDocumentResponse rejectPurchaseOrder(UUID warehouseId, UUID poId, String reason, UserIdentity user) {
        StockDocument po = getPo(warehouseId, poId);
        if (po.getStatus() != StockDocumentStatus.PENDING_APPROVAL) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Chỉ có thể từ chối đơn đang chờ duyệt (PENDING_APPROVAL)");
        }

        po.setStatus(StockDocumentStatus.CANCELLED);

        Map<String, Object> approval = po.getApproval() != null ? new LinkedHashMap<>(po.getApproval()) : new LinkedHashMap<>();
        approval.put("rejectedBy", user.id().toString());
        approval.put("rejectedRole", user.role());
        approval.put("rejectedAt", Instant.now().toString());
        approval.put("approvalStatus", "REJECTED");
        approval.put("rejectionReason", reason != null && !reason.isBlank() ? reason.trim() : "Từ chối phê duyệt");
        po.setApproval(approval);

        log.info("PO id={} bị từ chối bởi user={} role={}", poId, user.id(), user.role());
        return StockDocumentResponse.from(documentRepository.save(po));
    }

    @Transactional
    public StockDocumentResponse cancelPurchaseOrder(UUID warehouseId, UUID poId, String reason, UserIdentity user) {
        StockDocument po = getPo(warehouseId, poId);
        if (po.getStatus() == StockDocumentStatus.DONE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Không thể hủy đơn đặt hàng đã hoàn thành nhận hàng");
        }
        if (po.getStatus() == StockDocumentStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Đơn đặt hàng đã bị hủy trước đó");
        }

        // Kiểm tra xem đã có phiếu nhận hàng nào chưa
        List<StockDocument> receipts = documentRepository.findReceiptsByPoId(warehouseId, poId.toString());
        if (!receipts.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Đơn đặt hàng đã phát sinh phiếu nhận hàng, không thể hủy");
        }

        po.setStatus(StockDocumentStatus.CANCELLED);

        Map<String, Object> approval = po.getApproval() != null ? new LinkedHashMap<>(po.getApproval()) : new LinkedHashMap<>();
        approval.put("cancelledBy", user.id().toString());
        approval.put("cancelledRole", user.role());
        approval.put("cancelledAt", Instant.now().toString());
        if (reason != null && !reason.isBlank()) {
            approval.put("cancelReason", reason.trim());
        }
        po.setApproval(approval);

        log.info("PO id={} đã bị hủy bởi user={}", poId, user.id());
        return StockDocumentResponse.from(documentRepository.save(po));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. NHẬN HÀNG (RECEIPT) ĐỐI CHIẾU VỚI PO
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public StockDocumentResponse createReceipt(UUID warehouseId, CreateReceiptRequest request, UserIdentity user) {
        StockDocument po = getPo(warehouseId, request.poId());

        if (po.getStatus() != StockDocumentStatus.APPROVED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Chỉ có thể nhận hàng cho đơn đặt hàng đã được duyệt (APPROVED). Trạng thái hiện tại: " + po.getStatus());
        }

        if (request.lines() == null || request.lines().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phiếu nhận hàng phải có ít nhất 1 dòng mặt hàng thực nhận");
        }

        // Map các dòng của PO theo productId để đối chiếu
        Map<String, Map<String, Object>> poLinesByProductId = new HashMap<>();
        if (po.getLines() != null) {
            for (Map<String, Object> line : po.getLines()) {
                String pid = String.valueOf(line.get("productId"));
                poLinesByProductId.put(pid, line);
            }
        }

        List<Map<String, Object>> receiptLines = new ArrayList<>();
        Instant now = Instant.now();

        // Tạo phiếu RECEIPT trước để có ID gán vào biến động kho
        StockDocument receipt = StockDocument.builder()
                .warehouseId(warehouseId)
                .type(StockDocumentType.RECEIPT)
                .status(StockDocumentStatus.DONE)
                .createdBy(user.id())
                .lines(new ArrayList<>())
                .approval(new LinkedHashMap<>())
                .build();
        receipt = documentRepository.save(receipt);

        for (ReceiptLineRequest lineReq : request.lines()) {
            String pid = lineReq.productId().toString();
            Map<String, Object> poLine = poLinesByProductId.get(pid);

            if (poLine == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Sản phẩm id=" + lineReq.productId() + " không có trong đơn đặt hàng PO " + po.getId());
            }

            Product product = productRepository.findByIdAndWarehouseIdAndDeletedAtIsNull(lineReq.productId(), warehouseId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Không tìm thấy sản phẩm trong kho: " + lineReq.productId()));

            // Số lượng đặt trong PO
            BigDecimal orderedQty = toBigDecimal(poLine.get("qty"));
            BigDecimal receivedQty = lineReq.receivedQty();

            // Tính chênh lệch: diff = receivedQty - orderedQty (ví dụ: đặt 100, nhận 95 -> diff = -5)
            BigDecimal diff = receivedQty.subtract(orderedQty);

            // Đơn giá từ PO
            BigDecimal price = toBigDecimal(poLine.get("price"));

            String lotCode = lineReq.lotCode().trim();
            if (lotCode.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã lô hàng không được để trống khi nhận hàng");
            }

            // Xử lý tạo mới hoặc cộng vào stock_lots
            StockLot lot;
            Optional<StockLot> existingLotOpt = lotRepository.findByProduct_IdAndLotCodeIgnoreCaseAndDeletedAtIsNull(
                    product.getId(), lotCode);

            if (existingLotOpt.isPresent()) {
                lot = existingLotOpt.get();
                lot.setQuantity(lot.getQuantity().add(receivedQty));
                if (lot.getExpiryDate() == null && lineReq.expiryDate() != null) {
                    lot.setExpiryDate(lineReq.expiryDate());
                }
                if (lineReq.condition() != null) {
                    lot.setStatus(lineReq.condition());
                }
                lot = lotRepository.save(lot);
                log.info("Cộng dồn số lượng {} vào lô tồn tại id={} lotCode={}", receivedQty, lot.getId(), lotCode);
            } else {
                lot = StockLot.builder()
                        .product(product)
                        .lotCode(lotCode)
                        .expiryDate(lineReq.expiryDate())
                        .quantity(receivedQty)
                        .reserved(BigDecimal.ZERO)
                        .status(lineReq.condition() != null ? lineReq.condition() : StockLotStatus.OK)
                        .build();
                lot = lotRepository.save(lot);
                log.info("Tạo mới lô hàng id={} lotCode={} số lượng={}", lot.getId(), lotCode, receivedQty);
            }

            // Ghi nhật ký biến động kho (StockMovement)
            StockMovement movement = StockMovement.builder()
                    .warehouseId(warehouseId)
                    .product(product)
                    .lot(lot)
                    .documentType("RECEIPT")
                    .documentId(receipt.getId())
                    .qtyChange(receivedQty)
                    .actorId(user.id())
                    .note(String.format("Nhận hàng PO %s - Lô: %s - Đặt: %s, Nhận: %s (Lệch: %s)",
                            po.getId(), lotCode, orderedQty, receivedQty, diff))
                    .build();
            movementRepository.save(movement);

            // Cập nhật số lượng đã nhận vào dòng của PO
            BigDecimal currentReceived = toBigDecimal(poLine.get("receivedQty"));
            poLine.put("receivedQty", currentReceived.add(receivedQty));

            // Dòng chi tiết của phiếu nhận
            Map<String, Object> rLine = new LinkedHashMap<>();
            rLine.put("productId", product.getId().toString());
            rLine.put("productName", product.getName());
            rLine.put("sku", product.getSku());
            rLine.put("unit", product.getUnit());
            rLine.put("orderedQty", orderedQty);
            rLine.put("receivedQty", receivedQty);
            rLine.put("diff", diff);
            rLine.put("price", price);
            rLine.put("lotCode", lotCode);
            if (lineReq.expiryDate() != null) {
                rLine.put("expiryDate", lineReq.expiryDate().toString());
            }
            rLine.put("lotId", lot.getId().toString());
            receiptLines.add(rLine);
        }

        // Cập nhật thông tin phiếu RECEIPT
        receipt.setLines(receiptLines);
        Map<String, Object> receiptApproval = new LinkedHashMap<>();
        receiptApproval.put("poId", po.getId().toString());
        receiptApproval.put("receivedBy", user.id().toString());
        receiptApproval.put("receivedRole", user.role());
        receiptApproval.put("receivedAt", now.toString());
        if (request.note() != null && !request.note().isBlank()) {
            receiptApproval.put("note", request.note().trim());
        }
        receipt.setApproval(receiptApproval);
        StockDocument savedReceipt = documentRepository.save(receipt);

        // Cập nhật trạng thái PO
        // Mặc định hoàn thành PO nếu completePo = true hoặc không truyền (vì đã thực hiện nhận hàng)
        boolean complete = request.completePo() == null || Boolean.TRUE.equals(request.completePo());
        if (complete) {
            po.setStatus(StockDocumentStatus.DONE);
            Map<String, Object> poApproval = po.getApproval() != null ? new LinkedHashMap<>(po.getApproval()) : new LinkedHashMap<>();
            poApproval.put("completedAt", now.toString());
            poApproval.put("receiptId", savedReceipt.getId().toString());
            po.setApproval(poApproval);
        }
        documentRepository.save(po);

        log.info("Phiếu nhận hàng id={} theo PO id={} đã tạo thành công, PO status={}", savedReceipt.getId(), po.getId(), po.getStatus());
        return StockDocumentResponse.from(savedReceipt);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. TRA CỨU DANH SÁCH & CHI TIẾT
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<StockDocumentResponse> listPurchaseOrders(UUID warehouseId, StockDocumentStatus status, Pageable pageable) {
        if (status != null) {
            return documentRepository.findByWarehouseIdAndTypeAndStatus(warehouseId, StockDocumentType.PO, status, pageable)
                    .map(StockDocumentResponse::from);
        }
        return documentRepository.findByWarehouseIdAndType(warehouseId, StockDocumentType.PO, pageable)
                .map(StockDocumentResponse::from);
    }

    @Transactional(readOnly = true)
    public StockDocumentResponse getPurchaseOrder(UUID warehouseId, UUID poId) {
        StockDocument po = getPo(warehouseId, poId);
        return StockDocumentResponse.from(po);
    }

    @Transactional(readOnly = true)
    public Page<StockDocumentResponse> listReceipts(UUID warehouseId, Pageable pageable) {
        return documentRepository.findByWarehouseIdAndType(warehouseId, StockDocumentType.RECEIPT, pageable)
                .map(StockDocumentResponse::from);
    }

    @Transactional(readOnly = true)
    public StockDocumentResponse getReceipt(UUID warehouseId, UUID receiptId) {
        StockDocument receipt = documentRepository.findByIdAndWarehouseId(receiptId, warehouseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phiếu nhận hàng"));
        if (receipt.getType() != StockDocumentType.RECEIPT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chứng từ không phải là phiếu nhận hàng (RECEIPT)");
        }
        return StockDocumentResponse.from(receipt);
    }

    @Transactional(readOnly = true)
    public List<StockDocumentResponse> getReceiptsByPo(UUID warehouseId, UUID poId) {
        getPo(warehouseId, poId); // verify PO exists
        return documentRepository.findReceiptsByPoId(warehouseId, poId.toString()).stream()
                .map(StockDocumentResponse::from)
                .toList();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPER METHODS
    // ─────────────────────────────────────────────────────────────────────────

    private StockDocument getPo(UUID warehouseId, UUID poId) {
        StockDocument doc = documentRepository.findByIdAndWarehouseId(poId, warehouseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn đặt hàng PO"));
        if (doc.getType() != StockDocumentType.PO) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chứng từ không phải là đơn đặt hàng PO");
        }
        return doc;
    }

    private StockDocumentStatus determineSubmittedStatus(boolean isLargeSpending, UserIdentity user,
                                                         Map<String, Object> approval, BigDecimal totalAmount) {
        approval.put("submittedBy", user.id().toString());
        approval.put("submittedRole", user.role());
        approval.put("submittedAt", Instant.now().toString());

        if (isLargeSpending) {
            approval.put("requiresApproval", true);
            approval.put("approvalStatus", "PENDING_COMPANY_APPROVAL");
            approval.put("approvalNotice", "Chi tiêu lớn (" + totalAmount + " VNĐ >= " + largeSpendingThreshold + " VNĐ), cần trung tâm phê duyệt công ty duyệt (mục 2.8)");
            return StockDocumentStatus.PENDING_APPROVAL;
        }

        // Nếu người tạo là COMPANY_ADMIN và không phải chi tiêu lớn thì có thể trực tiếp APPROVED
        if ("COMPANY_ADMIN".equals(user.role()) || "SYSTEM_ADMIN".equals(user.role())) {
            approval.put("requiresApproval", false);
            approval.put("approvalStatus", "APPROVED");
            approval.put("approvedBy", user.id().toString());
            approval.put("approvedAt", Instant.now().toString());
            return StockDocumentStatus.APPROVED;
        }

        approval.put("requiresApproval", true);
        approval.put("approvalStatus", "PENDING_APPROVAL");
        return StockDocumentStatus.PENDING_APPROVAL;
    }

    private BigDecimal getPoTotalAmount(StockDocument po) {
        if (po.getApproval() != null && po.getApproval().get("totalAmount") != null) {
            return toBigDecimal(po.getApproval().get("totalAmount"));
        }
        BigDecimal sum = BigDecimal.ZERO;
        if (po.getLines() != null) {
            for (Map<String, Object> line : po.getLines()) {
                sum = sum.add(toBigDecimal(line.get("totalPrice")));
            }
        }
        return sum;
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) return BigDecimal.ZERO;
        if (value instanceof BigDecimal bd) return bd;
        if (value instanceof Number num) return BigDecimal.valueOf(num.doubleValue());
        try {
            return new BigDecimal(value.toString());
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }
}

