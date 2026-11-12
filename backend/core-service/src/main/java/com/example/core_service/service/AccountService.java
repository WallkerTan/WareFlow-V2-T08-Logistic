package com.example.core_service.service;

import com.example.core_service.entity.*;
import com.example.core_service.entity.enums.*;
import com.example.core_service.exception.ApiException;
import com.example.core_service.repository.*;
import com.example.core_service.security.SecurityUtils;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service @RequiredArgsConstructor @Transactional
public class AccountService {
    private final UserRepository users;
    private final CompanyRepository companies;
    private final PasswordEncoder encoder;

    public record EmployeeRequest(@NotBlank @Email String email, @NotBlank @Size(min=8,max=128) String password,
                                  @NotBlank @Size(max=255) String fullName) {}
    public record ProfileRequest(@NotBlank @Size(max=255) String fullName, @Size(max=2048) String avatar,
                                 Map<String,Object> profile) {}
    public record EmployeeUpdate(@NotBlank @Size(max=255) String fullName, @NotNull UserStatus status) {}
    public record PasswordRequest(@NotBlank String currentPassword, @NotBlank @Size(min=8,max=128) String newPassword) {}
    public record View(UUID id, UUID companyId, String email, String fullName, String avatar,
                       UserRole role, UserStatus status, Map<String,Object> profile) {
        static View of(User u) { return new View(u.getId(), u.getCompany()==null?null:u.getCompany().getId(),
                u.getEmail(),u.getFullName(),u.getAvatar(),u.getRole(),u.getStatus(),u.getProfile()); }
    }
    public View me() { return View.of(current()); }
    public View profile(ProfileRequest r) {
        User u=current(); u.setFullName(r.fullName().trim()); u.setAvatar(r.avatar());
        u.setProfile(r.profile()==null?null:new HashMap<>(r.profile())); return View.of(users.save(u));
    }
    public void password(PasswordRequest r) {
        User u=current(); if (!encoder.matches(r.currentPassword(),u.getPasswordHash())) throw ApiException.badRequest("Mật khẩu hiện tại không đúng");
        u.setPasswordHash(encoder.encode(r.newPassword())); users.save(u);
    }
    public List<View> employees() {
        UUID company=company(); return users.findByCompany_IdAndRole(company,UserRole.WAREHOUSE_MANAGER).stream().map(View::of).toList();
    }
    public View create(EmployeeRequest r) {
        UUID company=company(); String email=r.email().trim().toLowerCase(Locale.ROOT);
        if(users.existsByEmailIgnoreCase(email)) throw ApiException.conflict("Email đã được đăng ký");
        return View.of(users.save(User.builder().company(companies.findById(company).orElseThrow(()->ApiException.notFound("Không tìm thấy công ty")))
                .email(email).fullName(r.fullName().trim()).passwordHash(encoder.encode(r.password()))
                .role(UserRole.WAREHOUSE_MANAGER).status(UserStatus.ACTIVE).build()));
    }
    public View update(UUID id,EmployeeUpdate r) {
        UUID company=company(); User u=users.findById(id).orElseThrow(()->ApiException.notFound("Không tìm thấy nhân viên"));
        if(u.getRole()!=UserRole.WAREHOUSE_MANAGER || u.getCompany()==null || !company.equals(u.getCompany().getId())) throw ApiException.forbidden("Nhân viên không thuộc công ty");
        u.setFullName(r.fullName().trim());u.setStatus(r.status());return View.of(users.save(u));
    }
    public View employee(UUID id) {
        UUID company=company();User u=users.findById(id).orElseThrow(()->ApiException.notFound("Không tìm thấy nhân viên"));
        if(u.getRole()!=UserRole.WAREHOUSE_MANAGER||u.getCompany()==null||!company.equals(u.getCompany().getId()))throw ApiException.forbidden("Nhân viên không thuộc công ty");
        return View.of(u);
    }
    public void removeEmployee(UUID id){var current=employee(id);update(id,new EmployeeUpdate(current.fullName(),UserStatus.LOCKED));}
    private User current() { return users.findById(SecurityUtils.getCurrentUserId()).orElseThrow(()->ApiException.notFound("Không tìm thấy tài khoản")); }
    private UUID company() {
        if(SecurityUtils.getCurrentUserRole()!=UserRole.COMPANY_ADMIN || SecurityUtils.getCurrentCompanyId()==null) throw ApiException.forbidden("Chỉ quản trị công ty được quản lý nhân viên");
        return SecurityUtils.getCurrentCompanyId();
    }
}
