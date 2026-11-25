package com.example.core_service.service;

import com.example.core_service.entity.User;
import com.example.core_service.entity.enums.UserRole;
import com.example.core_service.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.MailException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@Slf4j
@RequiredArgsConstructor
public class PasswordResetService {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final AuthEmail authEmail;

    private boolean eligible(User user) {
        return user.getRole() == UserRole.COMPANY_ADMIN || user.getRole() == UserRole.WAREHOUSE_MANAGER;
    }

    @Transactional
    public void request(String email) {
        authEmail.requireEnabled();
        User user = users.lockByEmail(email.trim()).filter(this::eligible).orElse(null);
        if (user == null) return;
        Instant now = Instant.now();
        if (user.getResetCodeExpiresAt() != null &&
                user.getResetCodeExpiresAt().isAfter(now.plusSeconds(AuthEmail.TTL_SECONDS - 60))) return;

        String otp = authEmail.generateCode();
        try {
            authEmail.send(user.getEmail(), "WareFlow – Mã đặt lại mật khẩu", otp);
        } catch (MailException ex) {
            log.warn("Password reset email delivery failed ({})", ex.getClass().getSimpleName());
            return;
        }
        user.setResetCodeHash(encoder.encode(otp));
        user.setResetCodeExpiresAt(Instant.now().plusSeconds(AuthEmail.TTL_SECONDS));
        user.setResetAttempts(0);
    }

    @Transactional
    public boolean confirm(String email, String otp, String password) {
        authEmail.requireEnabled();
        User user = users.lockByEmail(email.trim()).filter(this::eligible).orElse(null);
        if (user == null || user.getResetCodeHash() == null ||
                !user.getResetCodeExpiresAt().isAfter(Instant.now()) || user.getResetAttempts() >= 5) return false;
        if (!encoder.matches(otp, user.getResetCodeHash())) {
            user.setResetAttempts(user.getResetAttempts() + 1);
            return false;
        }
        user.setPasswordHash(encoder.encode(password));
        user.setResetCodeHash(null);
        user.setResetCodeExpiresAt(null);
        user.setResetAttempts(null);
        return true;
    }
}
