package com.example.core_service.service;

import com.example.core_service.dto.request.CompanyProfileRequest;
import com.example.core_service.dto.request.IndividualProfileRequest;
import com.example.core_service.dto.request.LoginRequest;
import com.example.core_service.dto.request.RegisterCompanyRequest;
import com.example.core_service.dto.request.RegisterWarehouseManagerRequest;
import com.example.core_service.dto.response.AuthResponse;
import com.example.core_service.entity.Company;
import com.example.core_service.entity.User;
import com.example.core_service.entity.enums.CompanyStatus;
import com.example.core_service.entity.enums.ProfileType;
import com.example.core_service.entity.enums.UserRole;
import com.example.core_service.entity.enums.UserStatus;
import com.example.core_service.exception.ApiException;
import com.example.core_service.repository.CompanyRepository;
import com.example.core_service.repository.UserRepository;
import com.example.core_service.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    /**
     * Đăng ký công ty mới + tài khoản COMPANY_ADMIN quản lý.
     * Công ty được tạo ở trạng thái ACTIVE nên đăng nhập được ngay.
     */
    @Transactional
    public AuthResponse registerCompany(RegisterCompanyRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        String companyName = request.getCompanyName().trim();

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("Email đã được đăng ký");
        }
        if (companyRepository.existsByNameIgnoreCase(companyName)) {
            throw ApiException.conflict("Tên công ty đã tồn tại");
        }

        Map<String, Object> profile = new HashMap<>();
        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            profile.put("phone", request.getPhone().trim());
        }
        if (request.getAddress() != null && !request.getAddress().isBlank()) {
            profile.put("address", request.getAddress().trim());
        }

        Company company = companyRepository.save(Company.builder()
                .name(companyName)
                .businessModel(request.getBusinessModel())
                .status(CompanyStatus.ACTIVE)
                .profile(profile.isEmpty() ? null : profile)
                .build());

        User user = userRepository.save(User.builder()
                .company(company)
                .role(UserRole.COMPANY_ADMIN)
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .status(UserStatus.ACTIVE)
                .build());

        return toResponse(user);
    }

    /**
     * Đăng ký tài khoản WAREHOUSE_MANAGER kèm hồ sơ công ty hoặc cá nhân.
     * <p>
     * - profileType = COMPANY    : tạo mới {@link Company} (ACTIVE) và liên kết tài khoản vào công ty đó.
     * - profileType = INDIVIDUAL : không có công ty, hồ sơ cá nhân lưu vào {@code users.profile} (jsonb).
     * <p>
     * Mật khẩu được mã hoá BCrypt và không bao giờ trả về trong response.
     */
    @Transactional
    public AuthResponse registerWarehouseManager(RegisterWarehouseManagerRequest request) {
        String email = request.getEmail().trim().toLowerCase();

        UserRole role = request.getRole() != null ? request.getRole() : UserRole.WAREHOUSE_MANAGER;
        if (role != UserRole.WAREHOUSE_MANAGER) {
            throw ApiException.badRequest("Role không hợp lệ, chỉ hỗ trợ tạo tài khoản WAREHOUSE_MANAGER");
        }

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("Email đã được đăng ký");
        }

        ProfileType profileType = request.getProfileType() != null ? request.getProfileType() : ProfileType.INDIVIDUAL;

        Company company = null;
        Map<String, Object> userProfile;

        switch (profileType) {
            case COMPANY -> {
                CompanyProfileRequest companyProfile = request.getCompanyProfile();
                if (companyProfile == null) {
                    throw ApiException.badRequest("Hồ sơ công ty không được để trống khi đăng ký loại công ty");
                }
                if (request.getIndividualProfile() != null) {
                    throw ApiException.badRequest("Không được gửi cả hồ sơ công ty và hồ sơ cá nhân");
                }
                company = createCompanyForProfile(companyProfile);
                userProfile = new HashMap<>();
                userProfile.put("profileType", ProfileType.COMPANY.name());
                userProfile.put("companyName", company.getName());
                if (company.getProfile() != null) {
                    userProfile.putAll(company.getProfile());
                }
            }
            case INDIVIDUAL -> {
                IndividualProfileRequest individualProfile = request.getIndividualProfile();
                if (individualProfile == null) {
                    throw ApiException.badRequest("Hồ sơ cá nhân không được để trống khi đăng ký loại cá nhân");
                }
                if (request.getCompanyProfile() != null) {
                    throw ApiException.badRequest("Không được gửi cả hồ sơ công ty và hồ sơ cá nhân");
                }
                userProfile = buildIndividualProfile(individualProfile);
            }
            default -> throw ApiException.badRequest("Loại hồ sơ không hợp lệ");
        }

        User user = userRepository.save(User.builder()
                .company(company)
                .role(UserRole.WAREHOUSE_MANAGER)
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .status(UserStatus.ACTIVE)
                .profile(userProfile)
                .build());

        return toResponse(user);
    }

    /**
     * Tạo hồ sơ công ty cho tài khoản WAREHOUSE_MANAGER.
     * Công ty ở trạng thái ACTIVE giống luồng đăng ký công ty để tài khoản đăng nhập được ngay.
     */
    private Company createCompanyForProfile(CompanyProfileRequest request) {
        String companyName = request.getCompanyName().trim();
        if (companyRepository.existsByNameIgnoreCase(companyName)) {
            throw ApiException.conflict("Tên công ty đã tồn tại");
        }

        String taxCode = isNotBlank(request.getTaxCode()) ? request.getTaxCode().replace("-", "").trim() : null;
        if (taxCode != null && companyRepository.existsByTaxCodeIgnoreCase(taxCode)) {
            throw ApiException.conflict("Mã số thuế đã được đăng ký");
        }

        Map<String, Object> profile = new HashMap<>();
        if (isNotBlank(request.getPhone())) {
            profile.put("phone", request.getPhone().trim());
        }
        if (isNotBlank(request.getAddress())) {
            profile.put("address", request.getAddress().trim());
        }
        if (taxCode != null) {
            profile.put("taxCode", taxCode);
        }

        return companyRepository.save(Company.builder()
                .name(companyName)
                .businessModel(request.getBusinessModel())
                .status(CompanyStatus.ACTIVE)
                .profile(profile.isEmpty() ? null : profile)
                .build());
    }

    /**
     * Hồ sơ cá nhân lưu vào {@code users.profile} (jsonb).
     */
    private Map<String, Object> buildIndividualProfile(IndividualProfileRequest request) {
        if (!isNotBlank(request.getPhone())) {
            throw ApiException.badRequest("Số điện thoại không được để trống");
        }

        Map<String, Object> profile = new HashMap<>();
        profile.put("profileType", ProfileType.INDIVIDUAL.name());
        profile.put("phone", request.getPhone().trim());
        if (isNotBlank(request.getAddress())) {
            profile.put("address", request.getAddress().trim());
        }
        if (isNotBlank(request.getIdNumber())) {
            profile.put("idNumber", request.getIdNumber().trim());
        }
        if (isNotBlank(request.getDateOfBirth())) {
            profile.put("dateOfBirth", request.getDateOfBirth().trim());
        }
        return profile;
    }

    private boolean isNotBlank(String value) {
        return value != null && !value.isBlank();
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmailIgnoreCase(request.getEmail().trim())
                .orElseThrow(() -> ApiException.unauthorized("Email hoặc mật khẩu không đúng"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw ApiException.unauthorized("Email hoặc mật khẩu không đúng");
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw ApiException.forbidden("Tài khoản đang bị khoá");
        }
        if (user.getCompany() != null && user.getCompany().getStatus() == CompanyStatus.LOCKED) {
            throw ApiException.forbidden("Công ty đang bị khoá");
        }

        return toResponse(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse getCurrentUser(String userId) {
        UUID id;
        try {
            id = UUID.fromString(userId);
        } catch (IllegalArgumentException ex) {
            throw ApiException.unauthorized("Token không hợp lệ");
        }

        User user = userRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy người dùng"));

        return toResponse(user);
    }

    private AuthResponse toResponse(User user) {
        Company company = user.getCompany();
        return new AuthResponse(
                "Bearer",
                jwtTokenProvider.generateToken(user),
                jwtTokenProvider.expiresAt(),
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                company != null ? company.getId() : null,
                company != null ? company.getName() : null
        );
    }
}
