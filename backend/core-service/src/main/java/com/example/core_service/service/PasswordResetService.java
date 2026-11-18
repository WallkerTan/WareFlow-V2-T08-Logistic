package com.example.core_service.service;

import com.example.core_service.entity.User;
import com.example.core_service.entity.enums.UserRole;
import com.example.core_service.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Locale;

@Service
@Slf4j
@RequiredArgsConstructor
public class PasswordResetService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int TTL_SECONDS = 600;
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JavaMailSender mail;

    @Value("${SMTP_FROM:}")
    private String sender;

    private boolean eligible(User user) {
        return user.getRole() == UserRole.COMPANY_ADMIN || user.getRole() == UserRole.WAREHOUSE_MANAGER;
    }

    @Transactional
    public void request(String email) {
        User user = users.lockByEmail(email.trim()).filter(this::eligible).orElse(null);
        if (user == null) return;
        Instant now = Instant.now();
        if (user.getResetCodeExpiresAt() != null &&
                user.getResetCodeExpiresAt().isAfter(now.plusSeconds(TTL_SECONDS - 60))) return;

        String otp = String.format(Locale.ROOT, "%06d", RANDOM.nextInt(1_000_000));
        SimpleMailMessage message = new SimpleMailMessage();
        if (!sender.isBlank()) message.setFrom(sender);
        message.setTo(user.getEmail());
        message.setSubject("WareFlow – Mã đặt lại mật khẩu");
        message.setText("Mã xác nhận của bạn là " + otp + ". Mã có hiệu lực trong 10 phút.");
        try {
            mail.send(message);
        } catch (MailException ex) {
            log.warn("Password reset email delivery failed ({})", ex.getClass().getSimpleName());
            return;
        }
        user.setResetCodeHash(encoder.encode(otp));
        user.setResetCodeExpiresAt(Instant.now().plusSeconds(TTL_SECONDS));
        user.setResetAttempts(0);
    }

    @Transactional
    public boolean confirm(String email, String otp, String password) {
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
