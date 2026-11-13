package com.example.inventory_service;

import com.example.inventory_service.controller.StockOutboundController;
import com.example.inventory_service.controller.StockConcurrencyExceptionHandler;
import com.example.inventory_service.dto.StockDocumentResponse;
import com.example.inventory_service.entity.enums.*;
import com.example.inventory_service.security.WarehouseAccessService;
import com.example.inventory_service.security.WarehouseAccessService.UserIdentity;
import com.example.inventory_service.service.StockOutboundService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class StockOutboundControllerTests {
    StockOutboundService service = mock(StockOutboundService.class);
    WarehouseAccessService access = mock(WarehouseAccessService.class);
    MockMvc mvc;
    UUID warehouse = UUID.randomUUID(), id = UUID.randomUUID(), target = UUID.randomUUID();
    String token = "Bearer test";
    String path() { return "/warehouses/" + warehouse + "/exports"; }
    @BeforeEach void setup() { mvc = MockMvcBuilders.standaloneSetup(new StockOutboundController(service, access))
            .setControllerAdvice(new StockConcurrencyExceptionHandler()).build(); }

    @Test void concurrentUpdateReturnsConflict() throws Exception {
        when(service.get(warehouse, id)).thenThrow(new org.springframework.dao.OptimisticLockingFailureException("stale"));
        mvc.perform(get(path() + "/" + id).header("Authorization", token)).andExpect(status().isConflict());
    }

    @Test void anonymousReadIsRejected() throws Exception {
        when(access.authorizeRoles(null, warehouse, "WAREHOUSE_MANAGER", "COMPANY_ADMIN", "SYSTEM_ADMIN"))
                .thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        mvc.perform(get(path() + "/" + id)).andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }
    @Test void approvalRequiresAdministrator() throws Exception {
        when(access.authorizeRoles(token, warehouse, "COMPANY_ADMIN", "SYSTEM_ADMIN"))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));
        mvc.perform(post(path() + "/" + id + "/approve").header("Authorization", token)).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }
    @Test void invalidQuantityIsRejectedBeforeCreation() throws Exception {
        mvc.perform(post(path()).header("Authorization", token).contentType("application/json").content("""
                {"type":"EXPORT_SALE","lines":[{"lotId":"%s","quantity":0}]}
                """.formatted(UUID.randomUUID()))).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
    @Test void nullLineIsRejected() throws Exception {
        mvc.perform(post(path()).header("Authorization", token).contentType("application/json")
                .content("{\"type\":\"EXPORT_SALE\",\"lines\":[null]}" )).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
    @Test void transferRequiresDestinationAccess() throws Exception {
        when(access.authorizeTransfer(token, warehouse, target))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));
        mvc.perform(post(path()).header("Authorization", token).contentType("application/json").content("""
                {"type":"EXPORT_TRANSFER","targetWarehouseId":"%s","lines":[{"lotId":"%s","quantity":1,"targetProductId":"%s"}]}
                """.formatted(target, UUID.randomUUID(), UUID.randomUUID()))).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }
    @Test void transferCompletionRechecksDestinationAccess() throws Exception {
        when(service.get(warehouse, id)).thenReturn(new StockDocumentResponse(id, warehouse, target,
                StockDocumentType.EXPORT_TRANSFER, StockDocumentStatus.APPROVED, List.of(), Map.of(), null, null));
        when(access.authorizeTransfer(token, warehouse, target))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));
        mvc.perform(post(path() + "/" + id + "/complete").header("Authorization", token)).andExpect(status().isForbidden());
        verify(service, never()).transition(any(), any(), any(), any(), any());
    }
}
