package com.example.finance_service.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.UUID;

@Service
public class FinanceAccessService {
    private final javax.crypto.SecretKey key;
    private final String issuer;
    private final RestClient core;
    public FinanceAccessService(@Value("${wareflow.jwt.secret:Y3Vyb3VyZS1uZWVkcy1hLXNlY3JldC1rZXktbWluaW11bS0zMi1ieXRlcy1sb25nISE=}") String secret,
            @Value("${wareflow.jwt.issuer:wareflow-auth}") String issuer,
            @Value("${wareflow.core-service-url:http://localhost:8081}") String coreUrl) {
        this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret)); this.issuer = issuer;
        this.core = RestClient.builder().baseUrl(coreUrl).build();
    }
    public Identity authenticate(String authorization, String... roles) {
        if (authorization == null || !authorization.startsWith("Bearer ")) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bearer token required");
        try {
            Claims c = Jwts.parser().verifyWith(key).requireIssuer(issuer).build().parseSignedClaims(authorization.substring(7)).getPayload();
            String role = c.get("role", String.class); UUID id = UUID.fromString(c.getSubject());
            String company = c.get("companyId", String.class);
            UUID companyId = company == null || company.isBlank() ? null : UUID.fromString(company);
            for (String allowed : roles) if (allowed.equals(role)) return new Identity(id, companyId, role, authorization);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Role is not allowed");
        } catch (ResponseStatusException ex) { throw ex; }
        catch (Exception ex) { throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired token"); }
    }
    public UUID company(Identity user, UUID requested) {
        if ("SYSTEM_ADMIN".equals(user.role())) {
            if (requested == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "companyId is required for system admin");
            return requested;
        }
        if (user.companyId() == null) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account has no company");
        if (requested != null && !requested.equals(user.companyId())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Company access denied");
        return user.companyId();
    }
    public void warehouse(Identity user, UUID warehouseId, UUID companyId) {
        if (warehouseId == null) return;
        if ("SYSTEM_ADMIN".equals(user.role())) return;
        try {
            var node = core.get().uri("/warehouses/{id}", warehouseId).header(HttpHeaders.AUTHORIZATION, user.authorization()).retrieve().body(com.fasterxml.jackson.databind.JsonNode.class);
            if (node == null || !warehouseId.toString().equals(node.path("id").asText())) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Warehouse not found");
            if ("WAREHOUSE_MANAGER".equals(user.role())) {
                if (!user.id().toString().equals(node.path("handover").path("managerId").asText())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Warehouse is not assigned to you");
                if (!companyId.toString().equals(node.path("ownerCompanyId").asText())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Warehouse is outside company scope");
            } else if (!companyId.toString().equals(node.path("ownerCompanyId").asText())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Warehouse is outside company scope");
        } catch (ResponseStatusException ex) { throw ex; }
        catch (RestClientResponseException ex) { throw new ResponseStatusException(ex.getStatusCode(), "Cannot verify warehouse access"); }
        catch (Exception ex) { throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Cannot verify warehouse access"); }
    }
    public record Identity(UUID id, UUID companyId, String role, String authorization) { }
}
