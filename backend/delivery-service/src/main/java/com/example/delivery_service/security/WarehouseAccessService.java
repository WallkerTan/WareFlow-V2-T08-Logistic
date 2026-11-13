package com.example.delivery_service.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.*;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.*;
import org.springframework.web.server.ResponseStatusException;
import javax.crypto.SecretKey;
import java.util.*;

@Service
public class WarehouseAccessService {
    private final SecretKey key;
    private final String issuer;
    private final RestClient core;
    public WarehouseAccessService(@Value("${wareflow.jwt.secret}") String secret,
        @Value("${wareflow.jwt.issuer}") String issuer, @Qualifier("coreClient") RestClient core) {
        this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret)); this.issuer = issuer; this.core = core;
    }
    public UUID authorize(String token, UUID warehouseId, boolean write) {
        if (token == null || !token.startsWith("Bearer "))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Cần đăng nhập");
        UUID userId;
        UUID companyId;
        String role;
        try {
            var claims = Jwts.parser().verifyWith(key).requireIssuer(issuer).build()
                .parseSignedClaims(token.substring(7)).getPayload();
            userId = UUID.fromString(claims.getSubject());
            String company = claims.get("companyId", String.class);
            companyId = company == null || company.isBlank() ? null : UUID.fromString(company);
            role = claims.get("role", String.class);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token không hợp lệ hoặc hết hạn");
        }
        if (!write && "SYSTEM_ADMIN".equals(role)) {
            try { core.get().uri("/auth/me").header(HttpHeaders.AUTHORIZATION,token).retrieve().toBodilessEntity(); }
            catch(RestClientResponseException ex){int code=ex.getStatusCode().value();throw new ResponseStatusException(code==401?HttpStatus.UNAUTHORIZED:code==403?HttpStatus.FORBIDDEN:HttpStatus.SERVICE_UNAVAILABLE,"Không xác minh được tài khoản");}
            catch(RestClientException ex){throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Không kết nối được core-service");}
            return userId;
        }
        if (!"WAREHOUSE_MANAGER".equals(role) && !"COMPANY_ADMIN".equals(role))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền thao tác vận đơn");
        try {
            var warehouse = core.get().uri("/warehouses/{id}", warehouseId)
                .header(HttpHeaders.AUTHORIZATION, token).retrieve().body(Warehouse.class);
            if (warehouse == null || !warehouseId.equals(warehouse.id()))
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy kho");
            boolean allowed = "WAREHOUSE_MANAGER".equals(role)
                ? warehouse.handover() != null && userId.toString().equals(warehouse.handover().get("managerId"))
                : companyId != null && companyId.equals(warehouse.ownerCompanyId());
            if (!allowed) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền truy cập kho");
            return userId;
        } catch (RestClientResponseException ex) {
            int code = ex.getStatusCode().value();
            throw new ResponseStatusException(code == 401 || code == 403 || code == 404 ?
                HttpStatus.valueOf(code) : HttpStatus.SERVICE_UNAVAILABLE, "Không thể xác minh quyền kho");
        } catch (RestClientException ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Không thể kết nối core-service");
        }
    }
    public record Warehouse(UUID id, UUID ownerCompanyId, Map<String,Object> handover) {}
}
