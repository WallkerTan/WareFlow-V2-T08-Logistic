package com.example.core_service.service;

import com.example.core_service.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.Locale;

@Component
@RequiredArgsConstructor
public class AuthEmail {
    static final int TTL_SECONDS = 600;
    private static final SecureRandom RANDOM = new SecureRandom();
    private final JavaMailSender mail;

    @Value("${EMAIL_ENABLED:false}")
    private boolean enabled;

    @Value("${SMTP_FROM:}")
    private String sender;

    public boolean enabled() {
        return enabled;
    }

    void requireEnabled() {
        if (!enabled) throw ApiException.serviceUnavailable("Xác minh qua email đang tắt.");
    }

    String generateCode() {
        return String.format(Locale.ROOT, "%06d", RANDOM.nextInt(1_000_000));
    }

    void send(String email, String subject, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        if (!sender.isBlank()) message.setFrom(sender);
        message.setTo(email);
        message.setSubject(subject);
        message.setText("Mã xác nhận của bạn là " + code + ". Mã có hiệu lực trong 10 phút.");
        mail.send(message);
    }
}
