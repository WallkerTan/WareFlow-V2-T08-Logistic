package com.example.core_service.client;

import com.example.core_service.config.JwtProperties;
import com.example.core_service.entity.WarehouseFinanceEvent;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import java.time.Instant;
import java.util.Date;
import java.util.Map;

@Component
public class WarehouseFinanceClient {
    private final RestClient client;
    private final JwtProperties jwt;
    public WarehouseFinanceClient(JwtProperties jwt, @Value("${wareflow.finance-service-url:http://localhost:8083}") String url) {
        this.jwt = jwt;
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(2000); factory.setReadTimeout(5000);
        client = RestClient.builder().baseUrl(url).requestFactory(factory).build();
    }
    public void record(WarehouseFinanceEvent event) {
        Instant now = Instant.now();
        String token = Jwts.builder().issuer(jwt.getIssuer()).subject("core-service").claim("role", "SERVICE")
                .audience().add("finance-service").and().issuedAt(Date.from(now)).expiration(Date.from(now.plusSeconds(30)))
                .signWith(Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwt.getSecret()))).compact();
        client.post().uri("/internal/warehouse-charges").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .body(Map.of("eventId", event.getId(), "companyId", event.getCompanyId(), "warehouseId", event.getWarehouseId(),
                        "amount", event.getAmount(), "transactionType", event.getTransactionType(), "occurredAt", event.getOccurredAt()))
                .retrieve().toBodilessEntity();
    }
}
