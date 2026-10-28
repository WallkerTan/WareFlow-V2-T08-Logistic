package com.example.core_service.service;

import com.example.core_service.dto.request.LoginRequest;
import com.example.core_service.dto.request.RegisterCompanyRequest;
import com.example.core_service.dto.response.AuthResponse;
import com.example.core_service.entity.Company;
import com.example.core_service.entity.User;
import com.example.core_service.entity.enums.CompanyStatus;
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
