package com.example.core_service.controller;

import com.example.core_service.dto.request.LoginRequest;
import com.example.core_service.dto.request.RegisterCompanyRequest;
import com.example.core_service.dto.response.AuthResponse;
import com.example.core_service.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * Đăng ký công ty mới kèm tài khoản quản trị (COMPANY_ADMIN).
     * Trả về luôn access token để đăng nhập ngay.
     */
    @PostMapping("/register-company")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse registerCompany(@Valid @RequestBody RegisterCompanyRequest request) {
        return authService.registerCompany(request);
    }

    /**
     * Đăng nhập bằng email + mật khẩu, trả về JWT access token.
     */
    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    /**
     * Thông tin người dùng hiện tại (yêu cầu header Authorization: Bearer &lt;token&gt;).
     */
    @GetMapping("/me")
    public AuthResponse me(Authentication authentication) {
        return authService.getCurrentUser((String) authentication.getPrincipal());
    }
}
