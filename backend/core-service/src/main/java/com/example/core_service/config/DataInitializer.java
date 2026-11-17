package com.example.core_service.config;

import com.example.core_service.entity.User;
import com.example.core_service.entity.enums.UserRole;
import com.example.core_service.entity.enums.UserStatus;
import com.example.core_service.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(ApplicationArguments args) {
        String adminEmail = "admin@wareflow.com";
        if (!userRepository.existsByEmailIgnoreCase(adminEmail)) {
            User admin = User.builder()
                    .email(adminEmail)
                    .fullName("System Administrator")
                    .passwordHash(passwordEncoder.encode("admin123"))
                    .role(UserRole.SYSTEM_ADMIN)
                    .status(UserStatus.ACTIVE)
                    .company(null)
                    .build();

            userRepository.save(admin);
            log.info("Initialized default SYSTEM_ADMIN account: {} / admin123", adminEmail);
        }
    }
}

