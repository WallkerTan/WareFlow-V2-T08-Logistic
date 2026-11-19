package com.example.core_service.controller;

import com.example.core_service.entity.User;
import com.example.core_service.entity.enums.UserRole;
import com.example.core_service.exception.ApiException;
import com.example.core_service.repository.UserRepository;
import com.example.core_service.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserDirectoryController {
    private final UserRepository users;
    @GetMapping("/users") @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public Page<Map<String, Object>> list(@PageableDefault(size = 20, sort = "createdAt") Pageable pageable) { return users.findAll(pageable).map(this::response); }
    @GetMapping("/users/me")
    public Map<String, Object> me() { return response(users.findById(SecurityUtils.getCurrentUserId()).orElseThrow(() -> ApiException.notFound("Không tìm thấy tài khoản"))); }
    @GetMapping("/employees") @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public List<Map<String, Object>> employees() { return users.findByCompany_IdAndRole(SecurityUtils.getCurrentCompanyId(), UserRole.WAREHOUSE_MANAGER).stream().map(this::response).toList(); }
    private Map<String, Object> response(User user) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", user.getId()); result.put("email", user.getEmail()); result.put("fullName", user.getFullName());
        result.put("role", user.getRole()); result.put("status", user.getStatus()); result.put("createdAt", user.getCreatedAt());
        result.put("companyId", user.getCompany() == null ? null : user.getCompany().getId()); result.put("profile", user.getProfile());
        return result;
    }
}
