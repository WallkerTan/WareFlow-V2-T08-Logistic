package com.example.core_service.security;

import com.example.core_service.entity.enums.CompanyStatus;
import com.example.core_service.entity.enums.UserRole;
import com.example.core_service.repository.CompanyRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtTokenProvider jwtTokenProvider;
    private final CompanyRepository companyRepository;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith(BEARER_PREFIX)) {
            boolean authenticated = authenticate(header.substring(BEARER_PREFIX.length()), request, response);
            if (!authenticated && response.isCommitted()) {
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean authenticate(String token, HttpServletRequest request, HttpServletResponse response) throws IOException {
        try {
            Claims claims = jwtTokenProvider.parse(token);

            UUID userId = UUID.fromString(claims.getSubject());
            String email = claims.get(JwtTokenProvider.CLAIM_EMAIL, String.class);
            String roleStr = claims.get(JwtTokenProvider.CLAIM_ROLE, String.class);
            String companyIdStr = claims.get(JwtTokenProvider.CLAIM_COMPANY_ID, String.class);

            if (roleStr == null) {
                return false;
            }

            UserRole role = UserRole.valueOf(roleStr);
            UUID companyId = (companyIdStr != null && !companyIdStr.isBlank()) ? UUID.fromString(companyIdStr) : null;

            // Kiểm tra trạng thái khóa của công ty theo thời gian thực (trừ SYSTEM_ADMIN)
            if (companyId != null && role != UserRole.SYSTEM_ADMIN) {
                boolean isLocked = companyRepository.findById(companyId)
                        .map(c -> c.getStatus() == CompanyStatus.LOCKED)
                        .orElse(false);

                if (isLocked) {
                    SecurityContextHolder.clearContext();
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write("{\"status\":403,\"error\":\"Forbidden\",\"message\":\"Công ty của bạn hiện đang bị khóa bởi Quản trị viên hệ thống\"}");
                    return false;
                }
            }

            UserPrincipal principal = UserPrincipal.builder()
                    .id(userId)
                    .email(email)
                    .role(role)
                    .companyId(companyId)
                    .build();

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

            SecurityContextHolder.getContext().setAuthentication(authentication);
            return true;

        } catch (Exception ex) {
            SecurityContextHolder.clearContext();
            return false;
        }
    }
}
