package com.example.core_service.service;

import com.example.core_service.dto.request.UpdateCompanyProfileRequest;
import com.example.core_service.dto.request.UpdateCompanyStatusRequest;
import com.example.core_service.dto.response.CompanyResponse;
import com.example.core_service.entity.Company;
import com.example.core_service.entity.Notification;
import com.example.core_service.entity.SystemLog;
import com.example.core_service.entity.User;
import com.example.core_service.entity.enums.CompanyBusinessModel;
import com.example.core_service.entity.enums.CompanyStatus;
import com.example.core_service.entity.enums.NotificationScope;
import com.example.core_service.exception.ApiException;
import com.example.core_service.repository.CompanyRepository;
import com.example.core_service.repository.NotificationRepository;
import com.example.core_service.repository.SystemLogRepository;
import com.example.core_service.repository.UserRepository;
import com.example.core_service.security.SecurityUtils;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class CompanyService {

    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final SystemLogRepository systemLogRepository;
    private final NotificationRepository notificationRepository;

    @Transactional(readOnly = true)
    public Page<CompanyResponse> getAllCompanies(String search, CompanyStatus status, CompanyBusinessModel businessModel, Pageable pageable) {
        Specification<Company> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.like(cb.lower(root.get("name")), pattern));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (businessModel != null) {
                predicates.add(cb.equal(root.get("businessModel"), businessModel));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return companyRepository.findAll(spec, pageable).map(CompanyResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public CompanyResponse getCompanyById(UUID id) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy công ty với ID: " + id));
        return CompanyResponse.fromEntity(company);
    }

    @Transactional(readOnly = true)
    public CompanyResponse getMyCompany() {
        UUID companyId = SecurityUtils.getCurrentCompanyId();
        if (companyId == null) {
            throw ApiException.badRequest("Tài khoản hiện tại không thuộc về bất kỳ công ty nào");
        }
        return getCompanyById(companyId);
    }

    /**
     * Dành riêng cho SYSTEM_ADMIN: Khóa / mở khóa hoặc chuyển trạng thái công ty.
     */
    @Transactional
    public CompanyResponse updateCompanyStatus(UUID companyId, UpdateCompanyStatusRequest request) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy công ty với ID: " + companyId));

        CompanyStatus oldStatus = company.getStatus();
        CompanyStatus newStatus = request.getStatus();

        if (oldStatus == newStatus) {
            return CompanyResponse.fromEntity(company);
        }

        company.setStatus(newStatus);
        Company savedCompany = companyRepository.save(company);

        UUID actorId = SecurityUtils.getCurrentUserId();
        User actor = userRepository.findById(actorId).orElse(null);

        // 1. Ghi nhật ký hệ thống (SystemLog)
        String action = newStatus == CompanyStatus.LOCKED ? "LOCK_COMPANY" :
                (newStatus == CompanyStatus.ACTIVE ? "UNLOCK_COMPANY" : "UPDATE_COMPANY_STATUS");

        Map<String, Object> targetMap = Map.of(
                "companyId", company.getId().toString(),
                "companyName", company.getName()
        );

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("oldStatus", oldStatus.name());
        metadata.put("newStatus", newStatus.name());
        if (request.getReason() != null && !request.getReason().isBlank()) {
            metadata.put("reason", request.getReason().trim());
        }

        systemLogRepository.save(SystemLog.builder()
                .actor(actor)
                .company(company)
                .action(action)
                .target(targetMap)
                .metadata(metadata)
                .build());

        // 2. Tạo thông báo tới các thành viên công ty (Notification)
        String notifTitle = newStatus == CompanyStatus.LOCKED
                ? "Công ty " + company.getName() + " đã bị khóa bởi Quản trị viên hệ thống"
                : "Công ty " + company.getName() + " đã được mở khóa/cập nhật trạng thái sang " + newStatus.name();

        Map<String, Object> payload = new HashMap<>();
        payload.put("companyId", company.getId().toString());
        payload.put("status", newStatus.name());
        payload.put("reason", request.getReason());
        payload.put("channels", List.of("app", "email"));

        notificationRepository.save(Notification.builder()
                .recipient(null) // Broadcast cho toàn bộ user thuộc phạm vi
                .scope(NotificationScope.COMPANY)
                .type("COMPANY_STATUS_CHANGED")
                .title(notifTitle)
                .payload(payload)
                .isRead(false)
                .build());

        log.info("Company {} status updated from {} to {} by actor {}", companyId, oldStatus, newStatus, actorId);
        return CompanyResponse.fromEntity(savedCompany);
    }

    /**
     * Tiện ích khóa công ty
     */
    @Transactional
    public CompanyResponse lockCompany(UUID companyId, String reason) {
        UpdateCompanyStatusRequest req = new UpdateCompanyStatusRequest();
        req.setStatus(CompanyStatus.LOCKED);
        req.setReason(reason);
        return updateCompanyStatus(companyId, req);
    }

    /**
     * Tiện ích mở khóa công ty
     */
    @Transactional
    public CompanyResponse unlockCompany(UUID companyId) {
        UpdateCompanyStatusRequest req = new UpdateCompanyStatusRequest();
        req.setStatus(CompanyStatus.ACTIVE);
        req.setReason("Mở khóa hoạt động công ty");
        return updateCompanyStatus(companyId, req);
    }

    /**
     * Cập nhật thông tin profile công ty (System Admin hoặc Company Admin của công ty đó)
     */
    @Transactional
    public CompanyResponse updateCompanyProfile(UUID companyId, UpdateCompanyProfileRequest request) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy công ty với ID: " + companyId));

        if (!company.getName().equalsIgnoreCase(request.getName().trim())
                && companyRepository.existsByNameIgnoreCase(request.getName().trim())) {
            throw ApiException.conflict("Tên công ty đã tồn tại trên hệ thống");
        }

        company.setName(request.getName().trim());
        if (request.getBusinessModel() != null) {
            company.setBusinessModel(request.getBusinessModel());
        }

        Map<String, Object> profile = company.getProfile() != null ? new HashMap<>(company.getProfile()) : new HashMap<>();
        if (request.getPhone() != null) profile.put("phone", request.getPhone().trim());
        if (request.getAddress() != null) profile.put("address", request.getAddress().trim());
        if (request.getTaxCode() != null) profile.put("taxCode", request.getTaxCode().trim());
        if (request.getLogo() != null) profile.put("logo", request.getLogo().trim());
        if (request.getDescription() != null) profile.put("description", request.getDescription().trim());

        company.setProfile(profile.isEmpty() ? null : profile);
        Company saved = companyRepository.save(company);

        log.info("Company profile updated: id={}, name={}", companyId, company.getName());
        return CompanyResponse.fromEntity(saved);
    }
}

