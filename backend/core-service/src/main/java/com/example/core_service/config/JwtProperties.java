package com.example.core_service.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Cấu hình sinh / xác thực JWT.
 * Prefix: wareflow.jwt.*
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "wareflow.jwt")
public class JwtProperties {

    /**
     * Secret ký HMAC-SHA256, base64 encoded, tối thiểu 32 bytes.
     */
    private String secret = "Y3Vyb3VyZS1uZWVkcy1hLXNlY3JldC1rZXktbWluaW11bS0zMi1ieXRlcy1sb25nISE=";

    /**
     * Thời hạn access token.
     */
    private Duration accessTokenTtl = Duration.ofHours(8);

    /**
     * Issuer của token.
     */
    private String issuer = "wareflow-auth";
}
