package com.example.core_service.service;

import com.example.core_service.entity.*;
import com.example.core_service.entity.enums.*;
import com.example.core_service.exception.ApiException;
import com.example.core_service.repository.*;
import com.example.core_service.security.SecurityUtils;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service @RequiredArgsConstructor @Transactional
public class AccountService {
    private final WarehouseRepository warehouses;
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

    public record ContactUpdate(@Size(max = 50) String phone, @Size(max = 2000) String address) {}
    public record ProfileUpdate(
            @NotBlank @Size(max = 255) String fullName,
            @Size(max = 255) @Pattern(regexp = "^$|^https?://[^\\s]+$", message = "Ảnh đại diện cần đường dẫn HTTP hoặc HTTPS") String avatar,
            @Valid ContactUpdate profile) {}

    public View updateMe(ProfileUpdate request) {
        User user = current();
        user.setFullName(request.fullName().trim());
        user.setAvatar(request.avatar() == null || request.avatar().isBlank() ? null : request.avatar().trim());
        if (request.profile() != null) {
            Map<String, Object> profile = user.getProfile() == null ? new LinkedHashMap<>() : new LinkedHashMap<>(user.getProfile());
            if (request.profile().phone() != null) profile.put("phone", request.profile().phone().trim());
            if (request.profile().address() != null) profile.put("address", request.profile().address().trim());
            user.setProfile(profile);
        }
        return View.of(user);
    }
    public List<View> employees() {
        UUID company=company(); return users.findByCompany_IdAndRole(company,UserRole.WAREHOUSE_MANAGER).stream().filter(u -> u.getRemovedAt()==null).map(View::of).toList();
    }
    public View create(EmployeeRequest r) {
        UUID company=company(); String email=r.email().trim().toLowerCase(Locale.ROOT);
        if(users.existsByEmailIgnoreCase(email)) throw ApiException.conflict("Email đã được đăng ký");
        return View.of(users.save(User.builder().company(companies.findById(company).orElseThrow(()->ApiException.notFound("Không tìm thấy công ty")))
                .email(email).fullName(r.fullName().trim()).passwordHash(encoder.encode(r.password()))
                .role(UserRole.WAREHOUSE_MANAGER).status(UserStatus.ACTIVE).build()));
    }
    public record EmployeeUpdate(@NotBlank @Size(max=255) String fullName, @NotNull UserStatus status,
                                 @Size(min=8,max=128) String password) {}
    private User managedEmployee(UUID id) {
        UUID owner=company();
        return users.findById(id).filter(u -> u.getRole()==UserRole.WAREHOUSE_MANAGER && u.getRemovedAt()==null
                && u.getCompany()!=null && owner.equals(u.getCompany().getId()))
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy nhân viên"));
    }
    public View update(UUID id,EmployeeUpdate request) {
        User user=managedEmployee(id);
        user.setFullName(request.fullName().trim());
        user.setStatus(request.status());
        if(request.password()!=null) user.setPasswordHash(encoder.encode(request.password()));
        return View.of(users.save(user));
    }
    public void remove(UUID id) {
        User user=managedEmployee(id);
        if(warehouses.hasAssignedManager(id.toString())) throw ApiException.conflict("Hãy bàn giao kho trước khi xóa nhân viên.");
        user.setStatus(UserStatus.LOCKED);
        user.setRemovedAt(java.time.Instant.now());
    }
    private User current() { return users.findById(SecurityUtils.getCurrentUserId()).orElseThrow(()->ApiException.notFound("Không tìm thấy tài khoản")); }
    private UUID company() {
        if(SecurityUtils.getCurrentUserRole()!=UserRole.COMPANY_ADMIN || SecurityUtils.getCurrentCompanyId()==null) throw ApiException.forbidden("Chỉ quản trị công ty được quản lý nhân viên");
        return SecurityUtils.getCurrentCompanyId();
    }
}
