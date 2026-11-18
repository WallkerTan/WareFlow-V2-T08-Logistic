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
    public record View(UUID id, UUID companyId, String email, String fullName, String avatar,
                       UserRole role, UserStatus status, Map<String,Object> profile) {
        static View of(User u) { return new View(u.getId(), u.getCompany()==null?null:u.getCompany().getId(),
                u.getEmail(),u.getFullName(),u.getAvatar(),u.getRole(),u.getStatus(),u.getProfile()); }
    }
    public View me() { return View.of(current()); }
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
    private User current() { return users.findById(SecurityUtils.getCurrentUserId()).orElseThrow(()->ApiException.notFound("Không tìm thấy tài khoản")); }
    private UUID company() {
        if(SecurityUtils.getCurrentUserRole()!=UserRole.COMPANY_ADMIN || SecurityUtils.getCurrentCompanyId()==null) throw ApiException.forbidden("Chỉ quản trị công ty được quản lý nhân viên");
        return SecurityUtils.getCurrentCompanyId();
    }
}
