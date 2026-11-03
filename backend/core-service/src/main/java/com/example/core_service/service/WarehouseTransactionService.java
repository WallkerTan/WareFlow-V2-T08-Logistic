package com.example.core_service.service;

import com.example.core_service.dto.request.CreateWarehouseTransactionRequest;
import com.example.core_service.dto.request.NegotiateWarehouseTransactionRequest;
import com.example.core_service.dto.response.WarehouseTransactionResponse;
import com.example.core_service.entity.Company;
import com.example.core_service.entity.User;
import com.example.core_service.entity.Warehouse;
import com.example.core_service.entity.WarehouseTransaction;
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

@Service
@RequiredArgsConstructor
public class WarehouseTransactionService {

    private final WarehouseTransactionRepository transactionRepository;
    private final WarehouseRepository warehouseRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;

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
        if (warehouse.getWarehouseType() == null || !warehouse.getWarehouseType().name().equals(request.getType().name())) {
            throw ApiException.badRequest("Loại đề nghị không khớp loại kho đang đăng bán/cho thuê");
        }
        if (warehouse.getOwnerCompany() != null && warehouse.getOwnerCompany().getId().equals(current.getCompanyId())) {
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
        return WarehouseTransactionResponse.fromEntity(transactionRepository.save(transaction));
    }

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

    @Transactional
    public WarehouseTransactionResponse approve(UUID id) {
        WarehouseTransaction transaction = getTransaction(id);
        ensureCanDecide(transaction, SecurityUtils.getCurrentUser());
        ensureOpen(transaction);
        User approver = userRepository.findById(SecurityUtils.getCurrentUserId())
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy người duyệt"));
        transaction.setApprovedBy(approver);
        transaction.setStatus(WarehouseTransactionStatus.APPROVED);
        transaction.getWarehouse().setStatus(WarehouseStatus.ACTIVE);
        return WarehouseTransactionResponse.fromEntity(transactionRepository.save(transaction));
    }

    @Transactional
    public WarehouseTransactionResponse reject(UUID id, String reason) {
        WarehouseTransaction transaction = getTransaction(id);
        ensureCanDecide(transaction, SecurityUtils.getCurrentUser());
        ensureOpen(transaction);
        appendSystemMessage(transaction, "rejectionReason", reason == null || reason.isBlank() ? "Đề nghị bị từ chối" : reason.trim());
        transaction.setStatus(WarehouseTransactionStatus.REJECTED);
        return WarehouseTransactionResponse.fromEntity(transactionRepository.save(transaction));
    }

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
        if (current.getRole() == UserRole.COMPANY_ADMIN && ownerId != null && ownerId.equals(current.getCompanyId())) return;
        throw ApiException.forbidden("Chỉ chủ kho hoặc quản trị viên hệ thống của kho có thể duyệt đề nghị");
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
