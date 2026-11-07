package com.example.inventory_service.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.SecretKey;
import java.util.UUID;

/** Validates the shared WareFlow JWT and asks core-service for authoritative warehouse ownership. */
@Service
public class WarehouseAccessService {
    private final SecretKey key;
    private final String issuer;
    private final RestClient coreClient;

    public WarehouseAccessService(
            @Value("${wareflow.jwt.secret:Y3Vyb3VyZS1uZWVkcy1hLXNlY3JldC1rZXktbWluaW11bS0zMi1ieXRlcy1sb25nISE=}") String secret,
            @Value("${wareflow.jwt.issuer:wareflow-auth}") String issuer,
            @Value("${wareflow.core-service-url:http://localhost:8081}") String coreServiceUrl) {
        this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
        this.issuer = issuer;
        this.coreClient = RestClient.builder().baseUrl(coreServiceUrl).build();
    }

    public UserIdentity authorize(String authorization, UUID warehouseId, boolean write) {
        if (write) {
            return authorizeRoles(authorization, warehouseId, "WAREHOUSE_MANAGER");
        }
        return authorizeRoles(authorization, warehouseId, "WAREHOUSE_MANAGER", "COMPANY_ADMIN", "SYSTEM_ADMIN");
    }

    public UserIdentity authorizeRoles(String authorization, UUID warehouseId, String... allowedRoles) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Cần đăng nhập để truy cập kho");
        }
        Claims claims;
        try {
            claims = Jwts.parser().verifyWith(key).requireIssuer(issuer).build()
                    .parseSignedClaims(authorization.substring(7)).getPayload();
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token không hợp lệ hoặc đã hết hạn");
        }

        UUID userId;
        UUID companyId;
        try {
            userId = UUID.fromString(claims.getSubject());
            String companyClaim = claims.get("companyId", String.class);
            companyId = companyClaim == null || companyClaim.isBlank() ? null : UUID.fromString(companyClaim);
        } catch (RuntimeException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Thông tin tài khoản trong token không hợp lệ");
        }
        String role = claims.get("role", String.class);

        boolean roleAllowed = false;
        if (allowedRoles != null && allowedRoles.length > 0) {
            for (String r : allowedRoles) {
                if (r.equalsIgnoreCase(role)) {
                    roleAllowed = true;
                    break;
                }
            }
        } else {
            roleAllowed = "WAREHOUSE_MANAGER".equals(role) || "COMPANY_ADMIN".equals(role) || "SYSTEM_ADMIN".equals(role);
        }

        if (!roleAllowed) {
            if ("COMPANY_ADMIN".equals(role)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "company_admin chỉ có quyền xem hàng hóa");
            }
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Vai trò " + role + " không có quyền thực hiện thao tác này");
        }

        if ("SYSTEM_ADMIN".equals(role)) {
            return new UserIdentity(userId, companyId, role);
        }

        try {
            var warehouse = coreClient.get().uri("/warehouses/{id}", warehouseId)
                    .header(HttpHeaders.AUTHORIZATION, authorization).retrieve().body(com.fasterxml.jackson.databind.JsonNode.class);
            if (warehouse == null || !warehouse.path("id").asText().equals(warehouseId.toString())) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy kho");
            }
            if ("WAREHOUSE_MANAGER".equals(role)) {
                String manager = warehouse.path("handover").path("managerId").asText("");
                if (!userId.toString().equals(manager)) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không được phân công quản lý kho này");
                }
            } else {
                String ownerCompany = warehouse.path("ownerCompanyId").asText("");
                if (companyId == null || !companyId.toString().equals(ownerCompany)) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Kho không thuộc công ty của bạn");
                }
            }
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (RestClientResponseException ex) {
            HttpStatus status = ex.getStatusCode().value() == 401 ? HttpStatus.UNAUTHORIZED
                    : ex.getStatusCode().value() == 404 ? HttpStatus.NOT_FOUND
                    : ex.getStatusCode().value() == 403 ? HttpStatus.FORBIDDEN : HttpStatus.SERVICE_UNAVAILABLE;
            throw new ResponseStatusException(status, status == HttpStatus.SERVICE_UNAVAILABLE
                    ? "Không thể xác minh quyền truy cập kho với core-service" : "Không thể xác minh quyền truy cập kho");
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Không thể xác minh quyền truy cập kho với core-service");
        }
        return new UserIdentity(userId, companyId, role);
    }

    public record UserIdentity(UUID id, UUID companyId, String role) { }
}
