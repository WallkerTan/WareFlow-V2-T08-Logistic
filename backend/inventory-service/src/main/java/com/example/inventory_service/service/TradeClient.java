package com.example.inventory_service.service;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import com.example.inventory_service.entity.TradeOperation;
import java.util.*;
import java.time.Instant;
@Service
public class TradeClient {
    private final RestClient core,finance;
    private final javax.crypto.SecretKey key;
    private final String issuer;
    public TradeClient(@Value("${wareflow.core-service-url:http://localhost:8081}") String coreUrl,
            @Value("${wareflow.finance-service-url:http://localhost:8083}") String financeUrl,
            @Value("${wareflow.jwt.secret:Y3Vyb3VyZS1uZWVkcy1hLXNlY3JldC1rZXktbWluaW11bS0zMi1ieXRlcy1sb25nISE=}") String secret,
            @Value("${wareflow.jwt.issuer:wareflow-auth}") String issuer) {
        core=RestClient.builder().baseUrl(coreUrl).build(); finance=RestClient.builder().baseUrl(financeUrl).build();
        key=Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));this.issuer=issuer;
    }
    @SuppressWarnings("unchecked")
    public List<Map<String,Object>> catalog(UUID supplier,String auth) {
        return core.get().uri("/suppliers/{id}/products",supplier).header("Authorization",auth).retrieve().body(List.class);
    }
    public void settle(TradeOperation operation) {
        var token=Jwts.builder().subject("inventory-service").issuer(issuer).claim("role","SERVICE")
                .audience().add("finance-service").and().issuedAt(Date.from(Instant.now())).expiration(Date.from(Instant.now().plusSeconds(60))).signWith(key).compact();
        Map<String,Object> payment=new LinkedHashMap<>();
        payment.put("id",operation.getId());payment.put("companyId",operation.getCompanyId());
        payment.put("warehouseId",operation.isWarehousePayment()||!operation.getKind().equals("IMPORT")?operation.getWarehouseId():null);
        payment.put("kind",operation.getKind().equals("IMPORT")?"PURCHASE":operation.getKind());
        payment.put("amount",operation.getAmount());payment.put("note",operation.getKind()+" "+operation.getId());
        finance.post().uri("/internal/operations/settle").header("Authorization","Bearer "+token).body(payment).retrieve().toBodilessEntity();
    }
}
