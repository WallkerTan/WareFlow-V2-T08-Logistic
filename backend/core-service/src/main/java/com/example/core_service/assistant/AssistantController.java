package com.example.core_service.assistant;

import com.example.core_service.dto.response.WarehouseResponse;
import com.example.core_service.entity.enums.UserRole;
import com.example.core_service.entity.enums.WarehouseStatus;
import com.example.core_service.exception.ApiException;
import com.example.core_service.security.SecurityUtils;
import com.example.core_service.service.WarehouseService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Pageable;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tools.jackson.databind.JsonNode;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import static com.example.core_service.assistant.AssistantModel.Action.*;

@RestController
@RequestMapping("/assistant")
@PreAuthorize("hasAnyRole('WAREHOUSE_MANAGER','COMPANY_ADMIN')")
class AssistantController {
    record Selection(UUID warehouseId, UUID productId, UUID lotId) {}
    record ChatMessage(@jakarta.validation.constraints.Pattern(regexp="user|assistant") @NotBlank String role,
                       @NotBlank @Size(max=1500) String content) {}
    record Question(@NotBlank @Size(max=1500) String message, UUID warehouseId, Selection selected, Boolean keywordOnly,
                    @Size(max=10) List<@jakarta.validation.constraints.NotNull @Valid ChatMessage> history) {
        Question(String message, UUID warehouseId, Selection selected) { this(message, warehouseId, selected, false, List.of()); }
    }
    record Listing(String region, String address, java.math.BigDecimal price) {}
    record Match(UUID warehouseId, String warehouseName, JsonNode product, JsonNode lot, Listing listing) {}
    record Answer(String message, AssistantModel.Intent intent, List<Match> matches) {}
    private final WarehouseService warehouses;
    private final AssistantModel model;
    private final RestClient inventory;

    AssistantController(WarehouseService warehouses, AssistantModel model,
                        @Value("${INVENTORY_SERVICE_URL:http://localhost:8082}") String url) {
        this.warehouses = warehouses;
        this.model = model;
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(2000);
        factory.setReadTimeout(5000);
        inventory = RestClient.builder().baseUrl(url).requestFactory(factory).build();
    }

    @PostMapping("/chat")
    public Answer chat(@Valid @RequestBody Question question, @RequestHeader("Authorization") String auth) {
        var manager = SecurityUtils.getCurrentUserRole() == UserRole.WAREHOUSE_MANAGER;
        var scope = question.warehouseId() != null || manager ? inventoryScope(manager) : null;
        if ((manager && question.warehouseId() == null) || (scope != null &&
                scope.stream().noneMatch(w -> w.id().equals(question.warehouseId()))))
            throw ApiException.forbidden("Kho nằm ngoài phạm vi truy cập.");
        var history = question.history() == null ? List.<ChatMessage>of() : question.history();
        var intent = Boolean.TRUE.equals(question.keywordOnly()) ? InventoryLookup.product(question.message().trim()) :
                history.isEmpty() && question.selected() == null
                        ? (model.configured() ? InventoryLookup.parse(question.message()) : InventoryLookup.offline(question.message(), null))
                                .orElseGet(() -> model.interpret(question.message()))
                        : model.configured() ? model.interpret(question.message(), history, question.selected() != null)
                        : InventoryLookup.offline(question.message(), question.selected())
                                .orElseGet(() -> model.interpret(question.message(), history, question.selected() != null));
        if (intent.action() == CHAT || intent.action() == HELP && intent.reply() != null)
            return new Answer(intent.reply(), intent, List.of());
        var selected = Boolean.TRUE.equals(intent.useSelection()) ? question.selected() : null;
        if (Boolean.TRUE.equals(intent.useSelection()) && selected == null)
            return new Answer("Hãy chọn sản phẩm, lô hoặc kho trong kết quả trước.", intent, List.of());
        if (intent.action() == HELP)
            return new Answer("Bạn có thể tìm sản phẩm hoặc lô, kiểm tra hạn dùng, sửa thông tin hàng, lập phiếu nhập, xuất bán, tăng tồn theo lô hoặc tìm kho mua thuê.", intent, List.of());
        if (intent.action() == MARKET && manager || intent.action() == EDIT && !manager)
            throw ApiException.forbidden("Vai trò hiện tại không có quyền thực hiện nghiệp vụ này.");
        List<Match> matches = new ArrayList<>();
        if (intent.action() == MARKET) {
            for (var w : warehouses.getWarehouses(null, WarehouseStatus.AVAILABLE, null, null, Pageable.unpaged())) {
                if ((selected == null || w.id().equals(selected.warehouseId()))
                        && contains(w.name()+" "+w.region()+" "+w.address(), intent.query())
                        && (intent.warehouseType() == null || w.warehouseType().name().equals(intent.warehouseType()))
                        && (intent.maxPrice() == null || w.price().compareTo(intent.maxPrice()) <= 0))
                    matches.add(new Match(w.id(), w.name(), null, null, new Listing(w.region(),w.address(),w.price())));
            }
        } else {
            long start = System.nanoTime();
            try {
                for (var w : scope == null ? inventoryScope(false) : scope) {
                    if ((question.warehouseId() == null || w.id().equals(question.warehouseId()))
                            && (selected == null || w.id().equals(selected.warehouseId())) && contains(w.name(), intent.warehouse()))
                        search(w, intent, selected, auth, matches);
                }
            } catch (RestClientException e) {
                throw AssistantUpstream.failure("Dịch vụ kho", start, e, "Chưa đọc được dữ liệu kho. Vui lòng thử lại.");
            }
        }
        String message = matches.isEmpty() ? "Không tìm thấy kết quả phù hợp trong phạm vi truy cập." :
                "Tìm thấy " + matches.size() + " kết quả." + (matches.size() > 50 ? " Hiển thị 50 kết quả đầu. Hãy thu hẹp tìm kiếm." : "");
        if (matches.size() == 1 && matches.getFirst().product() != null) {
            var match = matches.getFirst();
            var stock = match.lot() == null ? match.product() : match.lot();
            String available = str(stock, "available");
            message = match.warehouseName() + " · " + str(match.product(), "name") + " (" + str(match.product(), "sku") + "). ";
            message += available.isBlank() ? "Chưa có số liệu khả dụng."
                    : stock.path("available").asDouble() == 0 ? "Đã hết hàng khả dụng."
                    : "Còn " + available + " " + str(match.product(), "unit") + " khả dụng.";
            if (match.lot() != null) message += " Lô " + str(stock,"lotCode") + ", hạn dùng "
                    + (str(stock,"expiryDate").isBlank() ? "chưa ghi nhận" : str(stock,"expiryDate")) + ".";
        } else if (matches.size() > 1) message += " Bạn có thể chọn một kết quả để xem chi tiết.";
        if (intent.expiryDays() != null) message += " Chỉ tính các lô có ghi hạn dùng.";
        return new Answer(message, intent, matches.stream().limit(50).toList());
    }

    private List<WarehouseResponse> inventoryScope(boolean manager) {
        var id = SecurityUtils.getCurrentUserId().toString();
        return warehouses.myCompany(Pageable.unpaged()).stream().filter(w -> !manager ||
                (w.handover() != null && id.equals(String.valueOf(w.handover().get("managerId"))))).toList();
    }

    private void search(WarehouseResponse w, AssistantModel.Intent i, Selection selected, String auth, List<Match> out) {
        String path = "/warehouses/" + w.id() + "/products";
        for (int page = 0; ; page++) {
            JsonNode data = read(path + "?size=100&sort=id,asc&page=" + page, auth);
            for (var p : data.path("content")) {
                if (selected != null && selected.productId() != null && !selected.productId().toString().equals(str(p,"id"))) continue;
                if (!stockMatches(p,i.stock())) continue;
                boolean nameMatch = contains(str(p,"name")+" "+str(p,"sku"), i.query());
                boolean lotMode = i.action() == LOTS || i.action() == ADJUST || i.lot() != null || i.expiryDays() != null
                        || i.status() != null || (selected != null && selected.lotId() != null);
                if (nameMatch && !lotMode) {
                    out.add(new Match(w.id(),w.name(),p,null,null));
                    continue;
                }
                var lots = read(path+"/"+str(p,"id")+"/lots",auth);
                if (!lots.isArray()) throw new RestClientException("Invalid inventory lot list");
                for (var lot : lots) {
                    if (selected != null && selected.lotId() != null && !selected.lotId().toString().equals(str(lot,"id"))) continue;
                    if ((nameMatch || contains(str(lot,"lotCode"),i.query())) && contains(str(lot,"lotCode"),i.lot())
                            && (i.status() == null || i.status().equalsIgnoreCase(str(lot,"status")))
                            && inWindow(str(lot,"expiryDate"),i.expiryDays(),LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"))))
                        out.add(new Match(w.id(),w.name(),p,lot,null));
                }
            }
            var meta = data.has("page") ? data.path("page") : data;
            if (!data.path("content").isArray() || !meta.path("totalPages").isNumber()) throw new RestClientException("Invalid inventory page");
            if (page + 1 >= meta.path("totalPages").asInt()) break;
        }
    }

    private JsonNode read(String path, String auth) {
        var data = inventory.get().uri(path).header("Authorization",auth).retrieve().body(JsonNode.class);
        if (data == null) throw new RestClientException("Empty inventory response");
        return data;
    }
    static boolean inWindow(String expiry,Integer days,LocalDate today) {
        if (days == null) return true;
        if (expiry.isBlank()) return false;
        var date = LocalDate.parse(expiry);
        return !date.isBefore(today) && !date.isAfter(today.plusDays(days));
    }
    private static boolean stockMatches(JsonNode p,String stock) {
        if (stock == null) return true;
        if (stock.equals("belowMin")) return p.path("belowMinStock").asBoolean();
        return stock.equals("positive") ? p.path("available").asDouble() > 0 : p.path("available").asDouble() == 0;
    }
    private static String str(JsonNode n,String field) {
        var value = n.path(field);
        return value.isNull() || value.isMissingNode() ? "" : value.asString("");
    }
    static boolean contains(String text,String term) { return term == null || fold(text).contains(fold(term)); }
    static String fold(String text) {
        return Normalizer.normalize(text.toLowerCase(Locale.ROOT),Normalizer.Form.NFD)
                .replaceAll("\\p{M}+","").replace('đ','d').trim();
    }
}
