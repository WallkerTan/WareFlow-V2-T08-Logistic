package com.example.core_service.service;

import com.example.core_service.dto.response.DailyLogSummaryResponse;
import com.example.core_service.dto.response.SystemLogResponse;
import com.example.core_service.entity.Company;
import com.example.core_service.entity.SystemLog;
import com.example.core_service.entity.User;
import com.example.core_service.exception.ApiException;
import com.example.core_service.repository.CompanyRepository;
import com.example.core_service.repository.SystemLogRepository;
import com.example.core_service.repository.UserRepository;
import com.example.core_service.security.SecurityUtils;
import com.example.core_service.security.UserPrincipal;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class SystemLogService {

    private static final Logger auditLogger = LoggerFactory.getLogger("AUDIT_LOGGER");
    private static final Logger log = LoggerFactory.getLogger(SystemLogService.class);

    private final SystemLogRepository systemLogRepository;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;

    /**
     * Ghi nhật ký hệ thống: Lưu vào database system_logs và đồng thời ghi vào file log theo ngày.
     */
    @Transactional
    public SystemLog recordLog(User actor,
                              Company company,
                              String action,
                              Map<String, Object> target,
                              Map<String, Object> metadata) {

        SystemLog systemLog = SystemLog.builder()
                .actor(actor)
                .company(company)
                .action(action != null ? action.trim() : "UNKNOWN_ACTION")
                .target(target != null ? target : new HashMap<>())
                .metadata(metadata != null ? metadata : new HashMap<>())
                .build();

        SystemLog saved = systemLogRepository.save(systemLog);

        // Ghi đồng thời ra file log hệ thống (luân chuyển theo ngày: logs/core-service/core-service-audit-yyyy-MM-dd.log)
        String actorInfo = actor != null ? (actor.getEmail() + " (" + actor.getId() + ")") : "SYSTEM/ANONYMOUS";
        String companyInfo = company != null ? (company.getName() + " (" + company.getId() + ")") : "SYSTEM_WIDE";

        auditLogger.info("Action={} | Actor={} | Company={} | Target={} | Metadata={}",
                action, actorInfo, companyInfo, target, metadata);

        log.info("System log recorded: id={}, action={}, actor={}", saved.getId(), action, actorInfo);
        return saved;
    }

    /**
     * Ghi log tiện ích bằng UUID
     */
    @Transactional
    public SystemLog recordLog(UUID actorId,
                              UUID companyId,
                              String action,
                              Map<String, Object> target,
                              Map<String, Object> metadata) {
        User actor = actorId != null ? userRepository.findById(actorId).orElse(null) : null;
        Company company = companyId != null ? companyRepository.findById(companyId).orElse(null) : null;
        return recordLog(actor, company, action, target, metadata);
    }

    /**
     * Tra cứu danh sách nhật ký hệ thống theo từng ngày (hoặc khoảng ngày), loại action, công ty, người thực hiện.
     * Dành cho SYSTEM_ADMIN xem toàn bộ hệ thống.
     */
    @Transactional(readOnly = true)
    public Page<SystemLogResponse> getLogs(LocalDate date,
                                          LocalDate fromDate,
                                          LocalDate toDate,
                                          String action,
                                          UUID companyId,
                                          UUID actorId,
                                          String search,
                                          Pageable pageable) {

        Specification<SystemLog> spec = createSpecification(date, fromDate, toDate, action, companyId, actorId, search);
        return systemLogRepository.findAll(spec, pageable).map(SystemLogResponse::fromEntity);
    }

    /**
     * Tra cứu nhật ký dành riêng cho COMPANY_ADMIN: tự động giới hạn phạm vi công ty của tài khoản đăng nhập.
     */
    @Transactional(readOnly = true)
    public Page<SystemLogResponse> getMyCompanyLogs(LocalDate date,
                                                    LocalDate fromDate,
                                                    LocalDate toDate,
                                                    String action,
                                                    UUID actorId,
                                                    String search,
                                                    Pageable pageable) {

        UUID companyId = SecurityUtils.getCurrentCompanyId();
        if (companyId == null) {
            throw ApiException.badRequest("Tài khoản hiện tại không thuộc về công ty nào");
        }

        Specification<SystemLog> spec = createSpecification(date, fromDate, toDate, action, companyId, actorId, search);
        return systemLogRepository.findAll(spec, pageable).map(SystemLogResponse::fromEntity);
    }

    /**
     * Lấy chi tiết 1 bản ghi log theo ID (kiểm tra phân quyền bảo mật).
     */
    @Transactional(readOnly = true)
    public SystemLogResponse getLogById(Long id) {
        SystemLog systemLog = systemLogRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy nhật ký hệ thống với ID: " + id));

        UserPrincipal current = SecurityUtils.getCurrentUser();
        // Nếu là COMPANY_ADMIN, chỉ được xem log của công ty mình
        if (current.getRole() != com.example.core_service.entity.enums.UserRole.SYSTEM_ADMIN) {
            if (systemLog.getCompany() == null || !Objects.equals(systemLog.getCompany().getId(), current.getCompanyId())) {
                throw ApiException.forbidden("Bạn không có quyền xem nhật ký của công ty khác");
            }
        }

        return SystemLogResponse.fromEntity(systemLog);
    }

    /**
     * Thống kê số lượng log phát sinh theo từng ngày trong N ngày gần nhất.
     */
    @Transactional(readOnly = true)
    public List<DailyLogSummaryResponse> getDailyStatistics(UUID companyId, int days) {
        int safeDays = Math.max(1, Math.min(days, 90));
        Instant startDate = Instant.now().minus(safeDays, ChronoUnit.DAYS);

        List<Object[]> rows = systemLogRepository.countLogsGroupedByDateNative(companyId, startDate);
        List<DailyLogSummaryResponse> summaries = new ArrayList<>();

        for (Object[] row : rows) {
            if (row[0] != null && row[1] != null) {
                LocalDate logDate;
                if (row[0] instanceof Date sqlDate) {
                    logDate = sqlDate.toLocalDate();
                } else if (row[0] instanceof LocalDate ld) {
                    logDate = ld;
                } else {
                    logDate = LocalDate.parse(row[0].toString());
                }

                Long count = ((Number) row[1]).longValue();
                summaries.add(new DailyLogSummaryResponse(logDate, count));
            }
        }

        return summaries;
    }

    private Specification<SystemLog> createSpecification(LocalDate date,
                                                         LocalDate fromDate,
                                                         LocalDate toDate,
                                                         String action,
                                                         UUID companyId,
                                                         UUID actorId,
                                                         String search) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            ZoneId zone = ZoneId.systemDefault();

            // 1. Lọc chính xác theo 1 ngày cụ thể (date = yyyy-MM-dd)
            if (date != null) {
                Instant startOfDay = date.atStartOfDay(zone).toInstant();
                Instant endOfDay = date.plusDays(1).atStartOfDay(zone).toInstant();
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startOfDay));
                predicates.add(cb.lessThan(root.get("createdAt"), endOfDay));
            } else {
                // 2. Lọc theo khoảng ngày fromDate -> toDate
                if (fromDate != null) {
                    Instant startFrom = fromDate.atStartOfDay(zone).toInstant();
                    predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startFrom));
                }
                if (toDate != null) {
                    Instant endTo = toDate.plusDays(1).atStartOfDay(zone).toInstant();
                    predicates.add(cb.lessThan(root.get("createdAt"), endTo));
                }
            }

            // 3. Lọc theo tên hành động (action)
            if (action != null && !action.isBlank()) {
                predicates.add(cb.equal(cb.upper(root.get("action")), action.trim().toUpperCase()));
            }

            // 4. Lọc theo công ty (companyId)
            if (companyId != null) {
                predicates.add(cb.equal(root.get("company").get("id"), companyId));
            }

            // 5. Lọc theo người thực hiện (actorId)
            if (actorId != null) {
                predicates.add(cb.equal(root.get("actor").get("id"), actorId));
            }

            // 6. Tìm kiếm theo từ khóa (search trong action, fullName, email, company name)
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                Predicate actionLike = cb.like(cb.lower(root.get("action")), pattern);
                Predicate actorNameLike = cb.like(cb.lower(root.join("actor", jakarta.persistence.criteria.JoinType.LEFT).get("fullName")), pattern);
                Predicate actorEmailLike = cb.like(cb.lower(root.join("actor", jakarta.persistence.criteria.JoinType.LEFT).get("email")), pattern);
                Predicate companyNameLike = cb.like(cb.lower(root.join("company", jakarta.persistence.criteria.JoinType.LEFT).get("name")), pattern);

                predicates.add(cb.or(actionLike, actorNameLike, actorEmailLike, companyNameLike));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}

