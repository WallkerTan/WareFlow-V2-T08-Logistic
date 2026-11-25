package com.example.core_service.assistant;

import com.example.core_service.dto.response.WarehouseResponse;
import com.example.core_service.entity.enums.UserRole;
import com.example.core_service.exception.ApiException;
import com.example.core_service.security.SecurityUtils;
import com.example.core_service.service.WarehouseService;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import tools.jackson.databind.json.JsonMapper;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AssistantTests {
    @Test void localLookupsHandleVietnameseAndKeepDraftsOnTheModelPath() {
        assertTrue(InventoryLookup.parse("Xin chào").isEmpty());
        assertEquals(AssistantModel.Action.CHAT, InventoryLookup.offline("Xin chào",null).orElseThrow().action());
        var selection = new AssistantController.Selection(UUID.randomUUID(),UUID.randomUUID(),null);
        var lots = InventoryLookup.offline("Lô nào sắp hết hạn?",selection).orElseThrow();
        assertTrue(lots.useSelection());
        assertEquals("near_expiry",lots.status());
        assertEquals(7,InventoryLookup.parse("Lô nào hết hạn trong 7 ngày?").orElseThrow().expiryDays());
        assertEquals("sp-01",InventoryLookup.parse("Tìm sản phẩm SP-01").orElseThrow().query());
        assertEquals("lot-123",InventoryLookup.parse("Mã lô LOT-123").orElseThrow().lot());
        assertEquals("dau do",InventoryLookup.parse("Đậu đỏ còn bao nhiêu?").orElseThrow().query());
        assertTrue(InventoryLookup.parse("Lập phiếu xuất bán 10 sản phẩm SP-01").isEmpty());
    }

    @Test void delayedReplySucceedsWithinBudgetAndTimeoutIsReportedAs504() throws Exception {
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        var json = new JsonMapper();
        server.createContext("/chat/completions", exchange -> {
            try (exchange) {
                try { Thread.sleep(300); }
                catch (InterruptedException e) { Thread.currentThread().interrupt(); return; }
                byte[] reply = json.writeValueAsBytes(Map.of("choices",List.of(Map.of("message",
                        Map.of("content","{\"action\":\"LOTS\",\"expiryDays\":7}")))));
                exchange.getResponseHeaders().set("Content-Type","application/json");
                exchange.sendResponseHeaders(200,reply.length);
                exchange.getResponseBody().write(reply);
            }
        });
        server.start();
        try {
            String base = "http://127.0.0.1:"+server.getAddress().getPort();
            var normal = new AssistantModel(json, base, "test", "test", 45000);
            assertEquals(7, normal.interpret("lô nào hết hạn trong 7 ngày").expiryDays());
            var shortBudget = new AssistantModel(json, base, "test", "test", 50);
            var error = assertThrows(ApiException.class, () -> shortBudget.interpret("lô nào hết hạn trong 7 ngày"));
            assertEquals(504, error.getStatus().value());
        } finally { server.stop(0); }
    }

    @Test void expiryIncludesBothBoundariesAndExcludesMissingDates() {
        var day = LocalDate.of(2026,11,19);
        assertTrue(AssistantController.inWindow(day.toString(),30,day));
        assertTrue(AssistantController.inWindow(day.plusDays(30).toString(),30,day));
        assertFalse(AssistantController.inWindow(day.minusDays(1).toString(),30,day));
        assertFalse(AssistantController.inWindow("",30,day));
    }

    @Test void readsOnlyAssignedWarehouseAndUsesProviderForInterpretationOnly() throws Exception {
        var user = UUID.randomUUID();
        var allowed = warehouse(user);
        var other = warehouse(UUID.randomUUID());
        var product = UUID.randomUUID();
        var count = new AtomicInteger();
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        var json = new JsonMapper();
        server.createContext("/v1/chat/completions", exchange -> {
            String body = new String(exchange.getRequestBody().readAllBytes(),StandardCharsets.UTF_8);
            assertFalse(body.contains("warehouse-token"));
            assertEquals("Bearer test-key",exchange.getRequestHeaders().getFirst("Authorization"));
            var intent = Map.of("action","SEARCH","query","dau do");
            byte[] reply = json.writeValueAsBytes(Map.of("choices",List.of(Map.of("message",Map.of("content",json.writeValueAsString(intent))))));
            exchange.getResponseHeaders().set("Content-Type","application/json");
            exchange.sendResponseHeaders(200,reply.length);
            exchange.getResponseBody().write(reply);
            exchange.close();
        });
        server.createContext("/warehouses/"+allowed.id()+"/products", exchange -> {
            assertEquals("GET",exchange.getRequestMethod());
            assertEquals("Bearer warehouse-token",exchange.getRequestHeaders().getFirst("Authorization"));
            count.incrementAndGet();
            byte[] reply = json.writeValueAsBytes(Map.of("content",List.of(Map.of("id",product,"name","Đậu đỏ","available",0)),"totalPages",1));
            exchange.getResponseHeaders().set("Content-Type","application/json");
            exchange.sendResponseHeaders(200,reply.length);
            exchange.getResponseBody().write(reply);
            exchange.close();
        });
        server.start();
        try (var security = mockStatic(SecurityUtils.class)) {
            String base = "http://127.0.0.1:"+server.getAddress().getPort();
            var model = new AssistantModel(json,base+"/v1","test-model","test-key",45000);
            assertEquals("dau do",model.interpret("tra cứu nâng cao").query());
            var warehouses = mock(WarehouseService.class);
            when(warehouses.myCompany(Pageable.unpaged())).thenReturn(new PageImpl<>(List.of(allowed,other)));
            security.when(SecurityUtils::getCurrentUserRole).thenReturn(UserRole.WAREHOUSE_MANAGER);
            security.when(SecurityUtils::getCurrentUserId).thenReturn(user);
            var offlineModel = mock(AssistantModel.class);
            when(offlineModel.interpret(anyString())).thenThrow(new ApiException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,"503"));
            var controller = new AssistantController(warehouses,offlineModel,mock(AssistantQuota.class),base);
            var ok = controller.chat(new AssistantController.Question("tìm dau do",allowed.id(),null),"Bearer warehouse-token");
            assertEquals(1,ok.matches().size());
            assertEquals(product.toString(),ok.matches().getFirst().product().path("id").asString());
            assertThrows(ApiException.class,()->controller.chat(new AssistantController.Question("tìm",other.id(),null),"Bearer warehouse-token"));
            assertEquals(1,count.get());
            verify(offlineModel).configured();
            verifyNoMoreInteractions(offlineModel);
        } finally { server.stop(0); }
    }

    private WarehouseResponse warehouse(UUID manager) {
        return new WarehouseResponse(UUID.randomUUID(),null,null,"Kho",null,null,null,null,null,null,
                Map.of("managerId",manager.toString()),null,null);
    }
}
