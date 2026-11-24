package com.example.finance_service;

import com.example.finance_service.controller.*;
import com.example.finance_service.dto.WarehouseChargeRequest;
import com.example.finance_service.entity.enums.*;
import com.example.finance_service.repository.*;
import com.example.finance_service.security.FinanceAccessService;
import com.example.finance_service.service.*;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @Transactional
class WarehouseChargeTests {
    @Autowired WalletService wallets;
    @org.junit.jupiter.api.BeforeEach void fundCompany() { wallets.settle(new WalletService.Payment(UUID.randomUUID(),company,null,"INCOME",new BigDecimal("100000000"),"Opening funding")); }
    @Autowired WarehouseChargeService charges;
    @Autowired WarehouseChargeRepository processed;
    @Autowired TransactionRepository transactions;
    @Autowired FinanceAccessService access;
    final UUID company = UUID.randomUUID(), warehouse = UUID.randomUUID(), event = UUID.randomUUID();
    final Instant occurred = Instant.parse("2025-11-01T10:00:00Z");
    WarehouseChargeRequest request(String amount) { return new WarehouseChargeRequest(event, company, warehouse, new BigDecimal(amount), "RENT", occurred); }

    @Test void duplicateDeliveryProducesOneExpenseAndOneFeeInTheOriginalPeriod() {
        charges.record(request("25000000")); charges.record(request("25000000"));
        transactions.flush();
        var rows = transactions.findByCompanyIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(company, occurred.minusSeconds(1), occurred.plusSeconds(1));
        assertEquals(2, rows.size());
        assertEquals(0, new BigDecimal("26250000").compareTo(rows.stream().map(t -> t.getAmount()).reduce(BigDecimal.ZERO, BigDecimal::add)));
        assertEquals(1, rows.stream().filter(t -> t.getType() == TransactionType.SYSTEM_FEE).count());
        assertTrue(rows.stream().allMatch(t -> event.equals(t.getRefDocumentId()) && warehouse.equals(t.getWarehouseId())));
        assertTrue(transactions.findByCompanyIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(company, Instant.now().minusSeconds(10), Instant.now().plusSeconds(10), PageRequest.of(0, 20)).stream().noneMatch(t->event.equals(t.getRefDocumentId())));
        assertThrows(ResponseStatusException.class, () -> charges.record(request("999")));
    }

    @Test void internalEndpointRejectsUserTokensAndAcceptsOnlyCoreServiceTokens() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new WarehouseChargeController(charges, access)).setControllerAdvice(new FinanceExceptionHandler()).build();
        String body = "{\"eventId\":\"%s\",\"companyId\":\"%s\",\"warehouseId\":\"%s\",\"amount\":100,\"transactionType\":\"BUY\",\"occurredAt\":\"%s\"}".formatted(event, company, warehouse, occurred);
        mvc.perform(post("/internal/warehouse-charges").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isUnauthorized());
        String secret = "Y3Vyb3VyZS1uZWVkcy1hLXNlY3JldC1rZXktbWluaW11bS0zMi1ieXRlcy1sb25nISE=";
        var key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
        String userToken = Jwts.builder().issuer("wareflow-auth").subject(UUID.randomUUID().toString()).claim("role", "SYSTEM_ADMIN")
                .expiration(Date.from(Instant.now().plusSeconds(60))).signWith(key).compact();
        mvc.perform(post("/internal/warehouse-charges").header("Authorization", "Bearer " + userToken).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isUnauthorized());
        assertFalse(processed.existsById(event));
        String token = Jwts.builder().issuer("wareflow-auth").subject("core-service").claim("role", "SERVICE").audience().add("finance-service").and()
                .expiration(Date.from(Instant.now().plusSeconds(60))).signWith(key).compact();
        mvc.perform(post("/internal/warehouse-charges").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isNoContent());
        assertTrue(processed.existsById(event));
    }
}
