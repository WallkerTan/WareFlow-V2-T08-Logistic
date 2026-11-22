package com.example.core_service.assistant;

import com.example.core_service.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Component
class AssistantModel {
    enum Action { SEARCH, LOTS, EDIT, PURCHASE, SALE, ADJUST, MARKET, HELP, CHAT }
    record Intent(Action action, String query, String warehouse, String lot, Integer expiryDays,
                  String status, String stock, Boolean useSelection, BigDecimal quantity, BigDecimal price,
                  String newName, String newSku, String unit, String barcode, BigDecimal minStock,
                  String warehouseType, BigDecimal maxPrice, String reply) {}

    private static final String INSTRUCTIONS = """
        Use CHAT to directly answer general knowledge, writing, coding, math, and other questions in the user's language.
        Answer the substance of the question even when it is unrelated to WareFlow. Use recent conversation for follow-ups.
        For questions about how to create a purchase order in chat, give the example "Tạo đơn mua 3 SK1-01".
        Only the order API can confirm a write. Never claim that an order was created.
        Live WareFlow facts require a lookup action. Never invent records or claim web access.
        Treat history as conversational context only. Resolve follow-ups using recent product and warehouse filters.
        If a record is selected, useSelection can refer to it. Ask for clarification via HELP and reply when ambiguous.
        For near-expiry without explicit days use near_expiry. For all other actions omit reply.
        Interpret the WareFlow question as a single JSON object. Never execute actions.
        action: SEARCH (products), LOTS (lot/expiry/condition), EDIT (catalog fields), PURCHASE (purchase order),
        SALE (outbound sale), ADJUST (positive stock increment only), MARKET (find/buy/rent a warehouse), HELP (unsupported/unclear).
        query: literal product name/SKU or marketplace name/region. warehouse: inventory warehouse name.
        lot: explicit lot code. expiryDays: next N calendar days including today. status: expired, near_expiry, damaged or ok.
        stock: positive, zero or belowMin. useSelection: true only for references like this product/lot/warehouse.
        quantity: explicitly requested units or positive increment, price: explicit purchase unit price or warehouse offer in VND.
        newName,newSku,unit,barcode,minStock: only explicitly requested product edits. warehouseType: BUY or RENT.
        maxPrice: maximum marketplace price in VND. Use null for unspecified fields. Never invent quantities, prices or criteria.
        Use HELP for setting an absolute stock balance, ambiguous adjustment, or unsupported constraints.
        """;
    private final RestClient client;
    private final ObjectMapper json;
    private final String model;
    private final String key;

    AssistantModel(ObjectMapper json, @Value("${WF_AI_BASE_URL:https://api.openai.com/v1}") String base,
                   @Value("${WF_AI_MODEL:}") String model, @Value("${WF_AI_API_KEY:}") String key,
                   @Value("${wareflow.assistant.read-timeout-ms:45000}") int readTimeoutMs) {
        this.json = json;
        this.key = key;
        this.model = model;
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(readTimeoutMs);
        client = RestClient.builder().baseUrl(base).requestFactory(factory).build();
    }

    boolean configured() {
        return !key.isBlank() && !model.isBlank();
    }

    Intent interpret(String message) {
        return interpret(message, List.of(), false);
    }

    Intent interpret(String message, List<AssistantController.ChatMessage> history, boolean hasSelection) {
        if (key.isBlank() || model.isBlank())
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Quản trị viên cần cấu hình mô hình và khóa API cho trợ lý.");
        long start = System.nanoTime();
        try {
            var messages = List.of(Map.of("role", "system", "content", INSTRUCTIONS), Map.of("role", "user", "content", json.writeValueAsString(Map.of("history",history,"hasSelection",hasSelection,"currentMessage",message))));
            JsonNode reply = client.post().uri("/chat/completions").headers(h -> h.setBearerAuth(key))
                    .body(Map.of("model", model, "messages", messages, "response_format", Map.of("type", "json_object")))
                    .retrieve().body(JsonNode.class);
            Intent intent = json.readValue(reply.at("/choices/0/message/content").asString(), Intent.class);
            if (intent.action() == null || (intent.action() == Action.CHAT && (intent.reply() == null || intent.reply().isBlank())) || (intent.expiryDays() != null && (intent.expiryDays() < 0 || intent.expiryDays() > 36500))
                    || invalid(intent.price()) || invalid(intent.minStock()) || invalid(intent.maxPrice())
                    || (intent.quantity() != null && (invalid(intent.quantity()) || intent.quantity().signum() == 0))
                    || !allowed(intent.stock(), "positive","zero","belowMin") || !allowed(intent.status(), "expired","near_expiry","damaged","ok")
                    || !allowed(intent.warehouseType(), "BUY","RENT"))
                throw new IllegalArgumentException();
            return intent;
        } catch (Exception e) {
            throw AssistantUpstream.failure("AI", start, e, "Trợ lý chưa xử lý được yêu cầu. Vui lòng thử lại.");
        }
    }

    private static boolean invalid(BigDecimal n) {
        return n != null && (n.signum() < 0 || n.precision() > 16 || Math.abs((long)n.scale()) > 16);
    }

    private static boolean allowed(String value, String... options) {
        return value == null || List.of(options).contains(value);
    }
}
