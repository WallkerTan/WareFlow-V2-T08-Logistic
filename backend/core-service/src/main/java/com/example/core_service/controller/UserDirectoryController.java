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
    private final com.example.core_service.repository.CompanyRepository companies;
    private final com.example.core_service.repository.WarehouseRepository warehouses;
    private final org.springframework.security.crypto.password.PasswordEncoder passwords;

    public record EmployeeRequest(@jakarta.validation.constraints.NotBlank String fullName,
            @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Email String email,
            String password) {}

    @PostMapping("/employees") @PreAuthorize("hasRole('COMPANY_ADMIN')") @Transactional
    public Map<String,Object> create(@jakarta.validation.Valid @RequestBody EmployeeRequest request) {
        if(request.password()==null || request.password().length()<8)throw ApiException.badRequest("Mật khẩu phải có ít nhất 8 ký tự");
        if(users.findByEmailIgnoreCase(request.email().trim()).isPresent())throw ApiException.conflict("Email đã được sử dụng");
        var user=new User();user.setCompany(companies.findById(SecurityUtils.getCurrentCompanyId()).orElseThrow());
        user.setRole(UserRole.WAREHOUSE_MANAGER);user.setStatus(com.example.core_service.entity.enums.UserStatus.ACTIVE);
        user.setEmail(request.email().trim());user.setFullName(request.fullName().trim());user.setPasswordHash(passwords.encode(request.password()));
        return response(users.save(user));
    }
    @PutMapping("/employees/{id}") @PreAuthorize("hasRole('COMPANY_ADMIN')") @Transactional
    public Map<String,Object> update(@PathVariable UUID id,@jakarta.validation.Valid @RequestBody EmployeeRequest request) {
        var user=employee(id);
        users.findByEmailIgnoreCase(request.email().trim()).filter(u->!u.getId().equals(id)).ifPresent(u->{throw ApiException.conflict("Email đã được sử dụng");});
        user.setFullName(request.fullName().trim());user.setEmail(request.email().trim());return response(user);
    }
    @PatchMapping("/employees/{id}/status") @PreAuthorize("hasRole('COMPANY_ADMIN')") @Transactional
    public Map<String,Object> status(@PathVariable UUID id,@RequestBody Map<String,String> body) {
        var user=employee(id);
        if(!Set.of("ACTIVE","LOCKED").contains(body.getOrDefault("status","")))throw ApiException.badRequest("Trạng thái không hợp lệ");
        user.setStatus(com.example.core_service.entity.enums.UserStatus.valueOf(body.get("status")));return response(user);
    }
    @DeleteMapping("/employees/{id}") @PreAuthorize("hasRole('COMPANY_ADMIN')") @Transactional
    public void delete(@PathVariable UUID id) {
        var user=employee(id);
        if(warehouses.findAll().stream().anyMatch(w->w.getHandover()!=null&&id.toString().equals(String.valueOf(w.getHandover().get("managerId")))))
            throw ApiException.conflict("Cần bàn giao kho cho người khác trước khi xóa nhân viên");
        users.delete(user);
    }
    private User employee(UUID id) {
        var user=users.findById(id).orElseThrow(()->ApiException.notFound("Không tìm thấy nhân viên"));
        if(user.getRole()!=UserRole.WAREHOUSE_MANAGER||user.getCompany()==null||!user.getCompany().getId().equals(SecurityUtils.getCurrentCompanyId()))throw ApiException.forbidden("Nhân viên không thuộc công ty");
        return user;
    }
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
