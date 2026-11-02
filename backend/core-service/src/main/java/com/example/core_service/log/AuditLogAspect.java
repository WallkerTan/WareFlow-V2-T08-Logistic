package com.example.core_service.log;

import com.example.core_service.entity.Company;
import com.example.core_service.entity.User;
import com.example.core_service.repository.CompanyRepository;
import com.example.core_service.repository.UserRepository;
import com.example.core_service.security.SecurityUtils;
import com.example.core_service.security.UserPrincipal;
import com.example.core_service.service.SystemLogService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Aspect
@Component
@RequiredArgsConstructor
public class AuditLogAspect {

    private static final Logger log = LoggerFactory.getLogger(AuditLogAspect.class);

    private final SystemLogService systemLogService;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;

    @Around("@annotation(auditLog)")
    public Object handleAuditLog(ProceedingJoinPoint joinPoint, AuditLog auditLog) throws Throwable {
        long startTime = System.currentTimeMillis();
        boolean isSuccess = true;
        String errorMessage = null;
        Object result = null;

        try {
            result = joinPoint.proceed();
            return result;
        } catch (Throwable ex) {
            isSuccess = false;
            errorMessage = ex.getMessage();
            throw ex;
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            try {
                recordAudit(joinPoint, auditLog, isSuccess, errorMessage, duration);
            } catch (Exception ex) {
                log.error("Failed to automatically record audit log for action: {}", auditLog.action(), ex);
            }
        }
    }

    private void recordAudit(ProceedingJoinPoint joinPoint,
                             AuditLog auditLog,
                             boolean isSuccess,
                             String errorMessage,
                             long durationMs) {

        HttpServletRequest request = getHttpServletRequest();
        String clientIp = request != null ? extractClientIp(request) : "127.0.0.1";
        String userAgent = request != null ? request.getHeader("User-Agent") : "Unknown";
        String uri = request != null ? request.getRequestURI() : "";
        String httpMethod = request != null ? request.getMethod() : "";

        User actor = null;
        Company company = null;

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof UserPrincipal principal) {
            actor = userRepository.findById(principal.getId()).orElse(null);
            if (principal.getCompanyId() != null) {
                company = companyRepository.findById(principal.getCompanyId()).orElse(null);
            }
        }

        Map<String, Object> target = new HashMap<>();
        if (!auditLog.targetType().isBlank()) {
            target.put("targetType", auditLog.targetType());
        }
        target.put("method", joinPoint.getSignature().toShortString());

        // Thu thập tham số truyền vào
        Object[] args = joinPoint.getArgs();
        if (args != null && args.length > 0) {
            for (Object arg : args) {
                if (arg instanceof UUID uuid) {
                    target.put("targetId", uuid.toString());
                }
            }
        }

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("status", isSuccess ? "SUCCESS" : "FAILED");
        metadata.put("durationMs", durationMs);
        metadata.put("clientIp", clientIp);
        metadata.put("userAgent", userAgent);
        metadata.put("uri", uri);
        metadata.put("httpMethod", httpMethod);
        if (!auditLog.description().isBlank()) {
            metadata.put("description", auditLog.description());
        }
        if (errorMessage != null) {
            metadata.put("errorMessage", errorMessage);
        }

        systemLogService.recordLog(actor, company, auditLog.action(), target, metadata);
    }

    private HttpServletRequest getHttpServletRequest() {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        return attrs != null ? attrs.getRequest() : null;
    }

    private String extractClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }
}

