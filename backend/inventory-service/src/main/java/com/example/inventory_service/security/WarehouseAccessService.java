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
            try { coreClient.get().uri("/auth/me").header(HttpHeaders.AUTHORIZATION,authorization).retrieve().toBodilessEntity(); }
            catch (RestClientResponseException ex) { throw new ResponseStatusException(ex.getStatusCode().value()==403?HttpStatus.FORBIDDEN:ex.getStatusCode().value()==401?HttpStatus.UNAUTHORIZED:HttpStatus.SERVICE_UNAVAILABLE,"Không xác minh được tài khoản hệ thống"); }
            catch (org.springframework.web.client.RestClientException ex) {throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Không kết nối được core-service");}
            return new UserIdentity(userId, companyId, role);
        }

        try {
            var warehouse = coreClient.get().uri("/warehouses/{id}", warehouseId)
                    .header(HttpHeaders.AUTHORIZATION, authorization).retrieve().body(WarehouseScope.class);
            if (warehouse == null || !warehouseId.equals(warehouse.id())) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy kho");
            }
            if ("WAREHOUSE_MANAGER".equals(role)) {
                UUID manager = warehouse.handover() == null ? null : warehouse.handover().managerId();
                if (!userId.equals(manager) || companyId == null || !companyId.equals(warehouse.ownerCompanyId())) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không được phân công quản lý kho này");
                }
            } else {
                UUID ownerCompany = warehouse.ownerCompanyId();
                if (companyId == null || !companyId.equals(ownerCompany)) {
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

    /** A transfer may enter another manager's warehouse, but never another company's. */
    public UserIdentity authorizeTransfer(String authorization, UUID sourceId, UUID targetId) {
        var user = authorizeRoles(authorization, sourceId, "WAREHOUSE_MANAGER", "COMPANY_ADMIN", "SYSTEM_ADMIN");
        if (sourceId.equals(targetId)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Kho nhận phải khác kho xuất");
        try {
            var source = coreClient.get().uri("/warehouses/{id}", sourceId).header(HttpHeaders.AUTHORIZATION, authorization).retrieve().body(WarehouseScope.class);
            var target = coreClient.get().uri("/warehouses/{id}", targetId).header(HttpHeaders.AUTHORIZATION, authorization).retrieve().body(WarehouseScope.class);
            if (source == null || target == null || source.ownerCompanyId() == null || !source.ownerCompanyId().equals(target.ownerCompanyId()))
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ điều chuyển giữa các kho cùng công ty");
        } catch (RestClientResponseException ex) {
            throw new ResponseStatusException(ex.getStatusCode().is4xxClientError() ? ex.getStatusCode() : HttpStatus.SERVICE_UNAVAILABLE, "Không xác minh được kho nhận");
        } catch (org.springframework.web.client.RestClientException ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Không kết nối được core-service");
        }
        return user;
    }

    public record UserIdentity(UUID id, UUID companyId, String role) { }
    public record WarehouseScope(UUID id, UUID ownerCompanyId, Handover handover) { }
    public record Handover(UUID managerId) { }
}
