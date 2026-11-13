package com.example.core_service.security;

import com.example.core_service.entity.enums.UserRole;
import com.example.core_service.exception.ApiException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Objects;
import java.util.UUID;

@Component("securityUtils")
public class SecurityUtils {

    public static UserPrincipal getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw ApiException.unauthorized("Chưa đăng nhập hoặc phiên làm việc đã hết hạn");
        }
        if (authentication.getPrincipal() instanceof UserPrincipal principal) {
            return principal;
        }
        throw ApiException.unauthorized("Thông tin xác thực không hợp lệ");
    }

    public static UUID getCurrentUserId() {
        return getCurrentUser().getId();
    }

    public static UserRole getCurrentUserRole() {
        return getCurrentUser().getRole();
    }

    public static UUID getCurrentCompanyId() {
        return getCurrentUser().getCompanyId();
    }

    public boolean isSystemAdmin() {
        return getCurrentUserRole() == UserRole.SYSTEM_ADMIN;
    }

    public boolean isCompanyAdmin() {
        return getCurrentUserRole() == UserRole.COMPANY_ADMIN;
    }

    public boolean isWarehouseManager() {
        return getCurrentUserRole() == UserRole.WAREHOUSE_MANAGER;
    }

    public boolean isCompanyOwner(UUID companyId) {
        if (companyId == null) {
            return false;
        }
        UserPrincipal user = getCurrentUser();
        return isSystemAdmin() || (isCompanyAdmin() && Objects.equals(user.getCompanyId(), companyId));
    }
}

