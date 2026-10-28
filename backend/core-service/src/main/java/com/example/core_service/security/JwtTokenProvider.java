package com.example.core_service.security;

import com.example.core_service.config.JwtProperties;
import com.example.core_service.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JwtTokenProvider {

    public static final String CLAIM_ROLE = "role";
    public static final String CLAIM_COMPANY_ID = "companyId";
    public static final String CLAIM_EMAIL = "email";

    private final JwtProperties jwtProperties;

    private volatile SecretKey secretKey;

    private SecretKey key() {
        SecretKey local = secretKey;
        if (local == null) {
            synchronized (this) {
                local = secretKey;
                if (local == null) {
                    byte[] decoded = Decoders.BASE64.decode(jwtProperties.getSecret());
                    local = Keys.hmacShaKeyFor(decoded);
                    secretKey = local;
                }
            }
        }
        return local;
    }

    public String generateToken(User user) {
        Instant issuedAt = Instant.now();
        Instant expiresAt = issuedAt.plus(jwtProperties.getAccessTokenTtl());

        return Jwts.builder()
                .subject(user.getId().toString())
                .issuer(jwtProperties.getIssuer())
                .claim(CLAIM_EMAIL, user.getEmail())
                .claim(CLAIM_ROLE, user.getRole().name())
                .claim(CLAIM_COMPANY_ID, user.getCompany() != null ? user.getCompany().getId().toString() : null)
                .issuedAt(Date.from(issuedAt))
                .expiration(Date.from(expiresAt))
                .signWith(key())
                .compact();
    }

    public Instant expiresAt() {
        return Instant.now().plus(jwtProperties.getAccessTokenTtl());
    }

    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(key())
                .requireIssuer(jwtProperties.getIssuer())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public UUID extractUserId(String token) {
        return UUID.fromString(parse(token).getSubject());
    }
}
