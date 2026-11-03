package com.example.core_service.log;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.jspecify.annotations.NonNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filter ghi nhật ký mọi request HTTP tới service ra file log hàng ngày.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 5)
public class HttpLoggingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(HttpLoggingFilter.class);

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {

        long startTime = System.currentTimeMillis();
        String uri = request.getRequestURI();

        // Bỏ qua actuator để tránh làm đầy file log hàng ngày
        if (uri.startsWith("/actuator")) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            int status = response.getStatus();
            String method = request.getMethod();
            String remoteAddr = request.getHeader("X-Forwarded-For");
            if (remoteAddr == null || remoteAddr.isBlank()) {
                remoteAddr = request.getRemoteAddr();
            } else {
                remoteAddr = remoteAddr.split(",")[0].trim();
            }

            if (status >= 500) {
                log.error("[HTTP] {} {} - Status: {} - Duration: {}ms - IP: {}", method, uri, status, duration, remoteAddr);
            } else if (status >= 400) {
                log.warn("[HTTP] {} {} - Status: {} - Duration: {}ms - IP: {}", method, uri, status, duration, remoteAddr);
            } else {
                log.info("[HTTP] {} {} - Status: {} - Duration: {}ms - IP: {}", method, uri, status, duration, remoteAddr);
            }
        }
    }
}

