package com.example.core_service.service;

import com.example.core_service.dto.response.AuthResponse;
import com.example.core_service.entity.RegistrationEmailCode;
import com.example.core_service.exception.ApiException;
import com.example.core_service.repository.RegistrationEmailCodeRepository;
import com.example.core_service.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.mail.MailException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Locale;
import java.util.function.Supplier;

@Service
@RequiredArgsConstructor
public class RegistrationEmailService {
    private final AuthEmail authEmail;
    private final RegistrationEmailCodeRepository codes;
    private final UserRepository users;
    private final PasswordEncoder encoder;

    @Transactional
    public void request(String address) {
        authEmail.requireEnabled();
        String email = normalize(address);
        if (users.existsByEmailIgnoreCase(email)) return;

        var challenge = codes.lockByEmail(email).orElse(null);
        if (challenge != null && challenge.getExpiresAt().isAfter(Instant.now().plusSeconds(AuthEmail.TTL_SECONDS - 60))) {
            return;
        }
        String code = authEmail.generateCode();
        boolean isNew = challenge == null;
        if (isNew) challenge = new RegistrationEmailCode(email);
        challenge.setCodeHash(encoder.encode(code));
        challenge.setExpiresAt(Instant.now().plusSeconds(AuthEmail.TTL_SECONDS));
        challenge.setAttempts(0);
        if (isNew) {
            try {
                codes.saveAndFlush(challenge);
            } catch (DataIntegrityViolationException ex) {
                throw ApiException.conflict("Mã vừa được yêu cầu. Vui lòng kiểm tra email.");
            }
        }
        try {
            authEmail.send(email, "WareFlow – Mã xác minh đăng ký", code);
        } catch (MailException ex) {
            throw ApiException.serviceUnavailable("Không gửi được mã qua email. Vui lòng thử lại sau.");
        }
    }

    @Transactional
    public AuthResponse register(String address, String otp, Supplier<AuthResponse> createAccount) {
        if (!authEmail.enabled()) return createAccount.get();
        if (otp == null || !otp.matches("[0-9]{6}")) return null;
        var challenge = codes.lockByEmail(normalize(address)).orElse(null);
        if (challenge == null || !challenge.getExpiresAt().isAfter(Instant.now()) || challenge.getAttempts() >= 5) {
            return null;
        }
        if (!encoder.matches(otp, challenge.getCodeHash())) {
            challenge.setAttempts(challenge.getAttempts() + 1);
            return null;
        }
        AuthResponse response = createAccount.get();
        codes.delete(challenge);
        return response;
    }

    private String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
