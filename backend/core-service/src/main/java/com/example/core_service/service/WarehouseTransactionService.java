package com.example.core_service.service;

import com.example.core_service.client.InventorySnapshotClient;
import com.example.core_service.dto.request.CreateWarehouseTransactionRequest;
import com.example.core_service.dto.request.HandoverWarehouseRequest;
import com.example.core_service.dto.request.NegotiateWarehouseTransactionRequest;
import com.example.core_service.dto.request.ReturnWarehouseRequest;
import com.example.core_service.dto.response.WarehouseTransactionResponse;
import com.example.core_service.entity.Company;
import com.example.core_service.entity.User;
import com.example.core_service.entity.Warehouse;
import com.example.core_service.entity.WarehouseTransaction;
import com.example.core_service.entity.enums.NotificationScope;
import com.example.core_service.entity.enums.UserRole;
import com.example.core_service.entity.enums.WarehouseStatus;
import com.example.core_service.entity.enums.WarehouseTransactionStatus;
import com.example.core_service.entity.enums.WarehouseTransactionType;
import com.example.core_service.exception.ApiException;
import com.example.core_service.repository.CompanyRepository;
import com.example.core_service.repository.UserRepository;
import com.example.core_service.repository.WarehouseRepository;
import com.example.core_service.repository.WarehouseTransactionRepository;
import com.example.core_service.security.SecurityUtils;
import com.example.core_service.security.UserPrincipal;
import jakarta.persistence.criteria.JoinType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Service xử lý toàn bộ vòng đời giao dịch kho:
 *  - Tạo đề nghị mua/thuê (BUY / RENT)
 *  - Thương lượng giá (NEGOTIATING)
 *  - Duyệt / Từ chối giao dịch (SYSTEM_ADMIN)
 *  - Bàn giao kho + gán quản lý (COMPANY_ADMIN)
 *  - Yêu cầu trả kho (RETURN)
 *  - Duyệt trả kho + thu hồi (SYSTEM_ADMIN)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WarehouseTransactionService {

    private final WarehouseTransactionRepository transactionRepository;
    private final WarehouseRepository            warehouseRepository;
    private final CompanyRepository              companyRepository;
    private final UserRepository                 userRepository;
    private final SystemLogService               systemLogService;
    private final NotificationService            notificationService;
    private final InventorySnapshotClient        inventorySnapshotClient;

    // ─────────────────────────────────────────────────────────────────────────
    // 1. TẠO ĐỀ NGHỊ MUA / THUÊ KHO
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * COMPANY_ADMIN hoặc WAREHOUSE_MANAGER tạo đề nghị mua/thuê kho.
     * Kho phải đang ở trạng thái AVAILABLE và đúng loại (BUY/RENT).
     */
    @Transactional
    public WarehouseTransactionResponse create(CreateWarehouseTransactionRequest request) {
        UserPrincipal current = SecurityUtils.getCurrentUser();

        if (current.getRole() == UserRole.SYSTEM_ADMIN) {
            throw ApiException.badRequest("Quản trị viên hệ thống không thể gửi đề nghị mua/thuê");
        }
        if (current.getCompanyId() == null) {
            throw ApiException.badRequest("Tài khoản cần thuộc một công ty để gửi đề nghị");
        }
        if (request.getType() == WarehouseTransactionType.RETURN) {
            throw ApiException.badRequest("Chỉ hỗ trợ đề nghị BUY hoặc RENT");
        }

        Warehouse warehouse = warehouseRepository.findById(request.getWarehouseId())
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy kho"));

        if (warehouse.getStatus() != WarehouseStatus.AVAILABLE) {
            throw ApiException.conflict("Kho hiện không khả dụng để mua/thuê");
        }
        if (warehouse.getWarehouseType() == null
                || !warehouse.getWarehouseType().name().equals(request.getType().name())) {
            throw ApiException.badRequest("Loại đề nghị không khớp loại kho đang đăng bán/cho thuê");
        }
        if (warehouse.getOwnerCompany() != null
                && warehouse.getOwnerCompany().getId().equals(current.getCompanyId())) {
            throw ApiException.badRequest("Công ty không thể gửi đề nghị cho kho của chính mình");
        }

        Company company = companyRepository.findById(current.getCompanyId())
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy công ty của tài khoản"));

        WarehouseTransaction transaction = WarehouseTransaction.builder()
                .warehouse(warehouse)
                .company(company)
                .type(request.getType())
                .status(WarehouseTransactionStatus.PENDING)
                .offeredPrice(request.getOfferedPrice())
                .negotiation(Map.of("messages", List.of()))
                .build();

        WarehouseTransaction saved = transactionRepository.save(transaction);

        // Ghi log
        systemLogService.recordLog(
                current.getId(), current.getCompanyId(),
                request.getType() == WarehouseTransactionType.BUY ? "REQUEST_BUY_WAREHOUSE" : "REQUEST_RENT_WAREHOUSE",
                Map.of("warehouseId", warehouse.getId().toString(), "warehouseName", warehouse.getName()),
                Map.of("transactionId", saved.getId().toString(),
                       "offeredPrice", request.getOfferedPrice() != null ? request.getOfferedPrice().toString() : "null")
        );

        // Thông báo SYSTEM_ADMIN
        notificationService.broadcastSystem(
                request.getType() == WarehouseTransactionType.BUY ? "WAREHOUSE_BUY_REQUEST" : "WAREHOUSE_RENT_REQUEST",
                "Yêu cầu " + (request.getType() == WarehouseTransactionType.BUY ? "mua" : "thuê") + " kho mới",
                Map.of("transactionId", saved.getId().toString(),
                       "warehouseId", warehouse.getId().toString(),
                       "warehouseName", warehouse.getName(),
                       "companyName", company.getName())
        );

        log.info("Đã tạo đề nghị {} kho id={} từ công ty {}", request.getType(), warehouse.getId(), company.getName());
        return WarehouseTransactionResponse.fromEntity(saved);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. DANH SÁCH GIAO DỊCH
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<WarehouseTransactionResponse> list(WarehouseTransactionStatus status, Pageable pageable) {
        UserPrincipal current = SecurityUtils.getCurrentUser();
        Specification<WarehouseTransaction> spec = (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            if (current.getRole() != UserRole.SYSTEM_ADMIN) {
                UUID companyId = current.getCompanyId();
                if (companyId == null) return cb.disjunction();
                var warehouse = root.join("warehouse", JoinType.LEFT);
                var ownerCompany = warehouse.join("ownerCompany", JoinType.LEFT);
                predicates.add(cb.or(
                        cb.equal(root.get("company").get("id"), companyId),
                        cb.equal(ownerCompany.get("id"), companyId)
                ));
            }
            if (status != null) predicates.add(cb.equal(root.get("status"), status));
            return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
        return transactionRepository.findAll(spec, pageable).map(WarehouseTransactionResponse::fromEntity);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. THƯƠNG LƯỢNG GIÁ
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public WarehouseTransactionResponse negotiate(UUID id, NegotiateWarehouseTransactionRequest request) {
        WarehouseTransaction transaction = getTransaction(id);
        UserPrincipal current = SecurityUtils.getCurrentUser();
        ensureParticipant(transaction, current);
        if (transaction.getStatus() != WarehouseTransactionStatus.PENDING
                && transaction.getStatus() != WarehouseTransactionStatus.NEGOTIATING) {
            throw ApiException.conflict("Giao dịch không còn ở trạng thái thương lượng");
        }

        Map<String, Object> negotiation = transaction.getNegotiation() != null
                ? new LinkedHashMap<>(transaction.getNegotiation()) : new LinkedHashMap<>();
        List<Map<String, Object>> messages = new ArrayList<>();
        Object existing = negotiation.get("messages");
        if (existing instanceof List<?> priorMessages) {
            for (Object item : priorMessages) {
                if (item instanceof Map<?, ?> prior) {
                    Map<String, Object> copy = new LinkedHashMap<>();
                    prior.forEach((key, value) -> copy.put(String.valueOf(key), value));
                    messages.add(copy);
                }
            }
        }

        Map<String, Object> message = new LinkedHashMap<>();
        message.put("message", request.getMessage().trim());
        message.put("offeredPrice", request.getOfferedPrice());
        message.put("senderId", current.getId().toString());
        message.put("senderRole", current.getRole().name());
        message.put("sentAt", Instant.now().toString());
        messages.add(message);
        negotiation.put("messages", messages);
        transaction.setNegotiation(negotiation);
        if (request.getOfferedPrice() != null) transaction.setOfferedPrice(request.getOfferedPrice());
        transaction.setStatus(WarehouseTransactionStatus.NEGOTIATING);
        return WarehouseTransactionResponse.fromEntity(transactionRepository.save(transaction));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. DUYỆT GIAO DỊCH MUA/THUÊ → CHUYỂN QUYỀN SỞ HỮU KHO
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * SYSTEM_ADMIN duyệt giao dịch mua/thuê:
     *  - Chuyển owner_company_id của kho sang công ty mua/thuê
     *  - Đổi status kho: PENDING → ACTIVE
     *  - Đổi status giao dịch: APPROVED → COMPLETED
     *  - Ghi system_log + tạo notification cho công ty và system
     */
    @Transactional
    public WarehouseTransactionResponse approve(UUID id) {
        WarehouseTransaction transaction = getTransaction(id);
        UserPrincipal current = SecurityUtils.getCurrentUser();
        ensureCanDecide(transaction, current);
        ensureOpen(transaction);

        if (transaction.getType() == WarehouseTransactionType.RETURN) {
            throw ApiException.badRequest("Dùng API approve-return để duyệt giao dịch trả kho");
        }

        User approver = userRepository.findById(current.getId())
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy người duyệt"));

        Warehouse warehouse = transaction.getWarehouse();
        Company buyerCompany = transaction.getCompany();

        // ── Chuyển quyền sở hữu kho ──
        warehouse.setOwnerCompany(buyerCompany);
        warehouse.setStatus(WarehouseStatus.ACTIVE);

        // ── Hoàn tất giao dịch ──
        transaction.setApprovedBy(approver);
        transaction.setStatus(WarehouseTransactionStatus.COMPLETED);

        warehouseRepository.save(warehouse);
        WarehouseTransaction saved = transactionRepository.save(transaction);

        String action = transaction.getType() == WarehouseTransactionType.BUY
                ? "BUY_WAREHOUSE" : "RENT_WAREHOUSE";

        // ── Ghi system log ──
        systemLogService.recordLog(
                current.getId(), null,
                action,
                Map.of("warehouseId", warehouse.getId().toString(),
                       "warehouseName", warehouse.getName()),
                Map.of("transactionId", saved.getId().toString(),
                       "buyerCompanyId", buyerCompany.getId().toString(),
                       "buyerCompanyName", buyerCompany.getName(),
                       "offeredPrice", transaction.getOfferedPrice() != null
                               ? transaction.getOfferedPrice().toString() : "null")
        );

        // ── Thông báo cho COMPANY_ADMIN của công ty mua/thuê ──
        String companyTitle = transaction.getType() == WarehouseTransactionType.BUY
                ? "Đề nghị mua kho đã được duyệt" : "Đề nghị thuê kho đã được duyệt";
        userRepository.findByCompany_IdAndRole(buyerCompany.getId(), UserRole.COMPANY_ADMIN)
                .forEach(admin -> notificationService.sendToUser(
                        admin.getId(),
                        NotificationScope.COMPANY,
                        action + "_APPROVED",
                        companyTitle,
                        Map.of("warehouseId", warehouse.getId().toString(),
                               "warehouseName", warehouse.getName(),
                               "transactionId", saved.getId().toString(),
                               "message", "Kho đã được chuyển vào tài khoản công ty bạn. Vui lòng thực hiện bàn giao với nhân viên quản lý.")
                ));

        // ── Thông báo broadcast system ──
        notificationService.broadcastSystem(
                action + "_COMPLETED",
                "Giao dịch " + (transaction.getType() == WarehouseTransactionType.BUY ? "mua" : "thuê")
                        + " kho hoàn tất",
                Map.of("warehouseId", warehouse.getId().toString(),
                       "warehouseName", warehouse.getName(),
                       "companyName", buyerCompany.getName())
        );

        log.info("SYSTEM_ADMIN {} đã duyệt giao dịch {} kho {} cho công ty {}",
                current.getId(), action, warehouse.getId(), buyerCompany.getName());

        return WarehouseTransactionResponse.fromEntity(saved);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. TỪ CHỐI GIAO DỊCH
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public WarehouseTransactionResponse reject(UUID id, String reason) {
        WarehouseTransaction transaction = getTransaction(id);
        ensureCanDecide(transaction, SecurityUtils.getCurrentUser());
        ensureOpen(transaction);

        Warehouse warehouse = transaction.getWarehouse();
        // Trả lại trạng thái AVAILABLE nếu kho đang PENDING (do đề nghị này giữ)
        if (warehouse.getStatus() == WarehouseStatus.PENDING) {
            warehouse.setStatus(WarehouseStatus.AVAILABLE);
            warehouseRepository.save(warehouse);
        }

        appendSystemMessage(transaction, "rejectionReason",
                reason == null || reason.isBlank() ? "Đề nghị bị từ chối" : reason.trim());
        transaction.setStatus(WarehouseTransactionStatus.REJECTED);

        WarehouseTransaction saved = transactionRepository.save(transaction);

        // Thông báo công ty
        if (transaction.getCompany() != null) {
            userRepository.findByCompany_IdAndRole(transaction.getCompany().getId(), UserRole.COMPANY_ADMIN)
                    .forEach(admin -> notificationService.sendToUser(
                            admin.getId(),
                            NotificationScope.COMPANY,
                            "WAREHOUSE_TRANSACTION_REJECTED",
                            "Đề nghị giao dịch kho bị từ chối",
                            Map.of("warehouseId", warehouse.getId().toString(),
                                   "warehouseName", warehouse.getName(),
                                   "reason", reason != null ? reason : "Không có lý do cụ thể")
                    ));
        }

        return WarehouseTransactionResponse.fromEntity(saved);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. BÀN GIAO KHO: GÁN NHÂN VIÊN QUẢN LÝ + LƯU SNAPSHOT TỒN KHO
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * COMPANY_ADMIN thực hiện bàn giao kho sau khi admin hệ thống đã duyệt:
     *  1. Chọn warehouse_manager trong công ty để nhận quản lý kho
     *  2. Lấy snapshot tồn kho từ inventory-service
     *  3. Lưu vào warehouses.handover (JSONB)
     *  4. Ghi log + thông báo
     */
    @Transactional
    public WarehouseTransactionResponse handover(UUID transactionId, HandoverWarehouseRequest request) {
        WarehouseTransaction transaction = getTransaction(transactionId);
        UserPrincipal current = SecurityUtils.getCurrentUser();

        if (current.getRole() != UserRole.COMPANY_ADMIN) {
            throw ApiException.forbidden("Chỉ COMPANY_ADMIN mới có thể thực hiện bàn giao kho");
        }
        if (transaction.getStatus() != WarehouseTransactionStatus.COMPLETED) {
            throw ApiException.conflict(
                    "Giao dịch chưa hoàn tất, không thể bàn giao. Status hiện tại: " + transaction.getStatus());
        }
        if (transaction.getType() == WarehouseTransactionType.RETURN) {
            throw ApiException.badRequest("Không thể bàn giao giao dịch trả kho");
        }

        Warehouse warehouse = transaction.getWarehouse();

        // Kiểm tra COMPANY_ADMIN thuộc đúng công ty sở hữu kho
        if (warehouse.getOwnerCompany() == null
                || !warehouse.getOwnerCompany().getId().equals(current.getCompanyId())) {
            throw ApiException.forbidden("Bạn không phải quản trị viên của công ty đang sở hữu kho này");
        }

        // Kiểm tra manager hợp lệ: phải là WAREHOUSE_MANAGER trong cùng công ty
        User manager = userRepository.findById(request.getManagerId())
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy nhân viên quản lý kho"));

        if (manager.getRole() != UserRole.WAREHOUSE_MANAGER) {
            throw ApiException.badRequest("Nhân viên được chọn không có vai trò WAREHOUSE_MANAGER");
        }
        if (manager.getCompany() == null || !manager.getCompany().getId().equals(current.getCompanyId())) {
            throw ApiException.forbidden("Nhân viên quản lý phải thuộc cùng công ty");
        }

        // Lấy snapshot tồn kho từ inventory-service (graceful fail)
        Map<String, Object> stockSnapshot = inventorySnapshotClient.getStockSnapshot(warehouse.getId());

        // Lưu handover vào JSONB
        Map<String, Object> handoverData = new LinkedHashMap<>();
        handoverData.put("managerId", manager.getId().toString());
        handoverData.put("managerName", manager.getFullName());
        handoverData.put("managerEmail", manager.getEmail());
        handoverData.put("assignedBy", current.getId().toString());
        handoverData.put("handoverTime", Instant.now().toString());
        handoverData.put("transactionId", transactionId.toString());
        handoverData.put("stockSnapshot", stockSnapshot);
        if (request.getNote() != null && !request.getNote().isBlank()) {
            handoverData.put("note", request.getNote().trim());
        }

        warehouse.setHandover(handoverData);
        warehouseRepository.save(warehouse);

        // Ghi system log
        systemLogService.recordLog(
                current.getId(), current.getCompanyId(),
                "WAREHOUSE_HANDOVER",
                Map.of("warehouseId", warehouse.getId().toString(),
                       "warehouseName", warehouse.getName()),
                Map.of("managerId", manager.getId().toString(),
                       "managerName", manager.getFullName(),
                       "transactionId", transactionId.toString())
        );

        // Thông báo cho manager
        notificationService.sendToUser(
                manager.getId(),
                NotificationScope.WAREHOUSE,
                "WAREHOUSE_HANDOVER_ASSIGNED",
                "Bạn được giao quản lý kho: " + warehouse.getName(),
                Map.of("warehouseId", warehouse.getId().toString(),
                       "warehouseName", warehouse.getName(),
                       "handoverTime", handoverData.get("handoverTime").toString())
        );

        // Thông báo system
        notificationService.broadcastSystem(
                "WAREHOUSE_HANDOVER_COMPLETED",
                "Bàn giao kho hoàn tất",
                Map.of("warehouseId", warehouse.getId().toString(),
                       "warehouseName", warehouse.getName(),
                       "companyName", warehouse.getOwnerCompany().getName(),
                       "managerName", manager.getFullName())
        );

        log.info("Bàn giao kho {} cho nhân viên {} thành công (giao dịch {})",
                warehouse.getId(), manager.getFullName(), transactionId);

        return WarehouseTransactionResponse.fromEntity(transaction);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. YÊU CẦU TRẢ KHO (COMPANY_ADMIN)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * COMPANY_ADMIN khởi tạo yêu cầu trả kho về hệ thống.
     * Tạo giao dịch type=RETURN, status=PENDING.
     */
    @Transactional
    public WarehouseTransactionResponse requestReturn(UUID warehouseId, ReturnWarehouseRequest request) {
        UserPrincipal current = SecurityUtils.getCurrentUser();
        if (current.getRole() != UserRole.COMPANY_ADMIN) {
            throw ApiException.forbidden("Chỉ COMPANY_ADMIN mới có thể yêu cầu trả kho");
        }

        Warehouse warehouse = warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy kho"));

        if (warehouse.getOwnerCompany() == null
                || !warehouse.getOwnerCompany().getId().equals(current.getCompanyId())) {
            throw ApiException.forbidden("Bạn không phải quản trị viên của công ty đang sở hữu kho này");
        }
        if (warehouse.getStatus() != WarehouseStatus.ACTIVE) {
            throw ApiException.conflict("Kho phải đang ở trạng thái ACTIVE mới có thể trả");
        }

        Company company = companyRepository.findById(current.getCompanyId())
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy công ty"));

        // Tạo giao dịch RETURN
        Map<String, Object> negotiation = new LinkedHashMap<>();
        negotiation.put("messages", List.of());
        if (request.getReason() != null && !request.getReason().isBlank()) {
            negotiation.put("returnReason", request.getReason().trim());
        }

        WarehouseTransaction returnTx = WarehouseTransaction.builder()
                .warehouse(warehouse)
                .company(company)
                .type(WarehouseTransactionType.RETURN)
                .status(WarehouseTransactionStatus.PENDING)
                .negotiation(negotiation)
                .build();

        WarehouseTransaction saved = transactionRepository.save(returnTx);

        // Ghi log
        systemLogService.recordLog(
                current.getId(), current.getCompanyId(),
                "REQUEST_RETURN_WAREHOUSE",
                Map.of("warehouseId", warehouse.getId().toString(),
                       "warehouseName", warehouse.getName()),
                Map.of("transactionId", saved.getId().toString(),
                       "reason", request.getReason() != null ? request.getReason() : "")
        );

        // Thông báo SYSTEM_ADMIN
        notificationService.broadcastSystem(
                "WAREHOUSE_RETURN_REQUEST",
                "Công ty yêu cầu trả kho: " + warehouse.getName(),
                Map.of("transactionId", saved.getId().toString(),
                       "warehouseId", warehouse.getId().toString(),
                       "warehouseName", warehouse.getName(),
                       "companyName", company.getName(),
                       "reason", request.getReason() != null ? request.getReason() : "")
        );

        log.info("Công ty {} yêu cầu trả kho {} (giao dịch {})",
                company.getName(), warehouse.getId(), saved.getId());

        return WarehouseTransactionResponse.fromEntity(saved);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 8. DUYỆT TRẢ KHO (SYSTEM_ADMIN)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * SYSTEM_ADMIN duyệt yêu cầu trả kho:
     *  - Kho RENT → trả về AVAILABLE (tái sử dụng)
     *  - Kho BUY → trả về RETURNED (lưu trữ lịch sử)
     *  - Xoá ownerCompany + xoá handover
     *  - Ghi log + thông báo
     */
    @Transactional
    public WarehouseTransactionResponse approveReturn(UUID transactionId) {
        WarehouseTransaction transaction = getTransaction(transactionId);
        UserPrincipal current = SecurityUtils.getCurrentUser();

        if (current.getRole() != UserRole.SYSTEM_ADMIN) {
            throw ApiException.forbidden("Chỉ SYSTEM_ADMIN mới có thể duyệt trả kho");
        }
        if (transaction.getType() != WarehouseTransactionType.RETURN) {
            throw ApiException.badRequest("Giao dịch này không phải yêu cầu trả kho");
        }
        if (transaction.getStatus() != WarehouseTransactionStatus.PENDING
                && transaction.getStatus() != WarehouseTransactionStatus.NEGOTIATING) {
            throw ApiException.conflict("Giao dịch đã được xử lý hoặc không ở trạng thái chờ duyệt");
        }

        User approver = userRepository.findById(current.getId())
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy người duyệt"));

        Warehouse warehouse = transaction.getWarehouse();
        Company returningCompany = transaction.getCompany();

        // Xác định trạng thái kho mới dựa theo loại kho (BUY → RETURNED, RENT → AVAILABLE)
        WarehouseStatus newStatus = (warehouse.getWarehouseType() != null
                && warehouse.getWarehouseType().name().equals("RENT"))
                ? WarehouseStatus.AVAILABLE
                : WarehouseStatus.RETURNED;

        // Thu hồi quyền sở hữu
        warehouse.setOwnerCompany(null);
        warehouse.setStatus(newStatus);
        warehouse.setHandover(null);  // Xoá snapshot bàn giao cũ

        // Hoàn tất giao dịch
        transaction.setApprovedBy(approver);
        transaction.setStatus(WarehouseTransactionStatus.COMPLETED);

        warehouseRepository.save(warehouse);
        WarehouseTransaction saved = transactionRepository.save(transaction);

        // Ghi log
        systemLogService.recordLog(
                current.getId(), null,
                "RETURN_WAREHOUSE",
                Map.of("warehouseId", warehouse.getId().toString(),
                       "warehouseName", warehouse.getName()),
                Map.of("transactionId", saved.getId().toString(),
                       "returningCompanyId", returningCompany.getId().toString(),
                       "returningCompanyName", returningCompany.getName(),
                       "newWarehouseStatus", newStatus.name())
        );

        // Thông báo cho công ty trả kho
        userRepository.findByCompany_IdAndRole(returningCompany.getId(), UserRole.COMPANY_ADMIN)
                .forEach(admin -> notificationService.sendToUser(
                        admin.getId(),
                        NotificationScope.COMPANY,
                        "WAREHOUSE_RETURN_APPROVED",
                        "Yêu cầu trả kho đã được duyệt: " + warehouse.getName(),
                        Map.of("warehouseId", warehouse.getId().toString(),
                               "warehouseName", warehouse.getName(),
                               "transactionId", saved.getId().toString())
                ));

        // Thông báo broadcast system
        notificationService.broadcastSystem(
                "WAREHOUSE_RETURNED",
                "Kho đã được thu hồi: " + warehouse.getName(),
                Map.of("warehouseId", warehouse.getId().toString(),
                       "warehouseName", warehouse.getName(),
                       "returnedByCompany", returningCompany.getName(),
                       "newStatus", newStatus.name())
        );

        log.info("SYSTEM_ADMIN {} duyệt trả kho {} từ công ty {}. Status mới: {}",
                current.getId(), warehouse.getId(), returningCompany.getName(), newStatus);

        return WarehouseTransactionResponse.fromEntity(saved);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 9. TỪ CHỐI TRẢ KHO (SYSTEM_ADMIN)
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public WarehouseTransactionResponse rejectReturn(UUID transactionId, String reason) {
        WarehouseTransaction transaction = getTransaction(transactionId);
        UserPrincipal current = SecurityUtils.getCurrentUser();

        if (current.getRole() != UserRole.SYSTEM_ADMIN) {
            throw ApiException.forbidden("Chỉ SYSTEM_ADMIN mới có thể từ chối trả kho");
        }
        if (transaction.getType() != WarehouseTransactionType.RETURN) {
            throw ApiException.badRequest("Giao dịch này không phải yêu cầu trả kho");
        }
        ensureOpen(transaction);

        appendSystemMessage(transaction, "rejectionReason",
                reason == null || reason.isBlank() ? "Yêu cầu trả kho bị từ chối" : reason.trim());
        transaction.setStatus(WarehouseTransactionStatus.REJECTED);

        WarehouseTransaction saved = transactionRepository.save(transaction);

        // Thông báo công ty
        userRepository.findByCompany_IdAndRole(transaction.getCompany().getId(), UserRole.COMPANY_ADMIN)
                .forEach(admin -> notificationService.sendToUser(
                        admin.getId(),
                        NotificationScope.COMPANY,
                        "WAREHOUSE_RETURN_REJECTED",
                        "Yêu cầu trả kho bị từ chối",
                        Map.of("warehouseId", transaction.getWarehouse().getId().toString(),
                               "warehouseName", transaction.getWarehouse().getName(),
                               "reason", reason != null ? reason : "Không có lý do cụ thể")
                ));

        return WarehouseTransactionResponse.fromEntity(saved);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private WarehouseTransaction getTransaction(UUID id) {
        return transactionRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy đề nghị giao dịch"));
    }

    private void ensureParticipant(WarehouseTransaction transaction, UserPrincipal current) {
        if (current.getRole() == UserRole.SYSTEM_ADMIN) return;
        UUID companyId = current.getCompanyId();
        if (companyId == null) throw ApiException.forbidden("Tài khoản không thuộc công ty tham gia giao dịch");
        boolean buyer = transaction.getCompany().getId().equals(companyId);
        boolean seller = transaction.getWarehouse().getOwnerCompany() != null
                && transaction.getWarehouse().getOwnerCompany().getId().equals(companyId);
        if (!buyer && !seller) throw ApiException.forbidden("Bạn không tham gia đề nghị giao dịch này");
    }

    private void ensureCanDecide(WarehouseTransaction transaction, UserPrincipal current) {
        if (current.getRole() == UserRole.SYSTEM_ADMIN) return;
        UUID ownerId = transaction.getWarehouse().getOwnerCompany() != null
                ? transaction.getWarehouse().getOwnerCompany().getId() : null;
        if (current.getRole() == UserRole.COMPANY_ADMIN && ownerId != null && ownerId.equals(current.getCompanyId()))
            return;
        throw ApiException.forbidden("Chỉ quản trị viên hệ thống hoặc chủ kho mới có thể duyệt");
    }

    private void ensureOpen(WarehouseTransaction transaction) {
        if (transaction.getStatus() != WarehouseTransactionStatus.PENDING
                && transaction.getStatus() != WarehouseTransactionStatus.NEGOTIATING) {
            throw ApiException.conflict("Đề nghị đã được xử lý");
        }
    }

    private void appendSystemMessage(WarehouseTransaction transaction, String key, String value) {
        Map<String, Object> negotiation = transaction.getNegotiation() != null
                ? new LinkedHashMap<>(transaction.getNegotiation()) : new LinkedHashMap<>();
        negotiation.put(key, value);
        transaction.setNegotiation(negotiation);
    }
}
