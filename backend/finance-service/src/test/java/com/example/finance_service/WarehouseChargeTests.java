package com.example.finance_service;
import com.example.finance_service.repository.TransactionRepository;
import com.example.finance_service.entity.enums.TransactionType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import tools.jackson.databind.ObjectMapper;
import java.util.*;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest(properties="INTERNAL_API_KEY=test-service-key") @AutoConfigureMockMvc
class WarehouseChargeTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired TransactionRepository transactions;
    @Test void purchaseAndFivePercentFeeAreRecordedOnlyOnce() throws Exception {
        UUID event=UUID.randomUUID(),company=UUID.randomUUID(),warehouse=UUID.randomUUID();
        String body=json.writeValueAsString(Map.of("eventId",event,"companyId",company,"warehouseId",warehouse,"amount",1000,"occurredAt","2026-11-12T00:00:00Z"));
        mvc.perform(post("/internal/warehouse-charges").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isUnauthorized());
        mvc.perform(post("/internal/warehouse-charges").header("X-Internal-Key","test-service-key").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk());
        mvc.perform(post("/internal/warehouse-charges").header("X-Internal-Key","test-service-key").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("already_applied"));
        var saved=transactions.findAll().stream().filter(t->event.equals(t.getRefDocumentId())).toList();assertEquals(2,saved.size());
        assertEquals(0,saved.stream().filter(t->t.getType()==TransactionType.SYSTEM_FEE).findFirst().orElseThrow().getAmount().compareTo(new BigDecimal("50")));
        assertEquals(java.time.Instant.parse("2026-11-12T00:00:00Z"),saved.getFirst().getCreatedAt());
        String changed=body.replace("1000","2000");
        mvc.perform(post("/internal/warehouse-charges").header("X-Internal-Key","test-service-key").contentType(MediaType.APPLICATION_JSON).content(changed)).andExpect(status().isConflict());
        assertEquals(2,transactions.findAll().stream().filter(t->event.equals(t.getRefDocumentId())).count());
    }
}
