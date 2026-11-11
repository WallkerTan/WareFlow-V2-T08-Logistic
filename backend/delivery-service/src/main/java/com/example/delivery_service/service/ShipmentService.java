package com.example.delivery_service.service;

import com.example.delivery_service.client.InventoryClient;
import com.example.delivery_service.dto.*;
import com.example.delivery_service.entity.Shipment;
import com.example.delivery_service.entity.enums.*;
import com.example.delivery_service.repository.ShipmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
public class ShipmentService {
    private final ShipmentRepository repository;
    private final InventoryClient inventory;

    public ShipmentResponse create(UUID warehouse, ShipmentRequests.Create request, UUID actor, String token) {
        inventory.requireCompletedSale(token, warehouse, request.documentId());
        BigDecimal amount = request.codAmount() == null ? BigDecimal.ZERO : request.codAmount();
        var shipment = Shipment.builder().warehouseId(warehouse).documentId(request.documentId())
            .carrier(clean(request.carrier())).trackingCode(clean(request.trackingCode()))
            .codAmount(amount).codStatus(amount.signum() == 0 ? CodStatus.NOT_REQUIRED : CodStatus.PENDING).build();
        event(shipment, actor, "CREATED", null, null);
        return ShipmentResponse.from(repository.saveAndFlush(shipment));
    }

    @Transactional(readOnly=true)
    public Page<ShipmentResponse> list(UUID warehouse, ShipmentStatus status, CodStatus codStatus, String q, Pageable page) {
        Specification<Shipment> spec = (root, query, cb) -> cb.equal(root.get("warehouseId"), warehouse);
        if (status != null) spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        if (codStatus != null) spec = spec.and((root, query, cb) -> cb.equal(root.get("codStatus"), codStatus));
        if (q != null && !q.isBlank()) {
            String term = q.trim().toLowerCase(Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.get("trackingCode")), "%" + term + "%", '\\'));
        }
        return repository.findAll(spec, page).map(ShipmentResponse::from);
    }

    @Transactional(readOnly=true)
    public ShipmentResponse get(UUID warehouse, UUID id) {
        return ShipmentResponse.from(repository.findByIdAndWarehouseId(id, warehouse).orElseThrow(ShipmentService::missing));
    }

    public ShipmentResponse update(UUID warehouse, UUID id, ShipmentRequests.Update request, UUID actor) {
        var s = locked(warehouse, id);
        if (s.getStatus() != ShipmentStatus.CREATED) conflict("Chỉ sửa vận đơn khi còn CREATED");
        if (request.carrier() == null && request.trackingCode() == null && request.codAmount() == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cần ít nhất một trường cập nhật");
        if (request.carrier() != null) s.setCarrier(clean(request.carrier()));
        if (request.trackingCode() != null) s.setTrackingCode(clean(request.trackingCode()));
        if (request.codAmount() != null) {
            s.setCodAmount(request.codAmount());
            s.setCodStatus(request.codAmount().signum() == 0 ? CodStatus.NOT_REQUIRED : CodStatus.PENDING);
        }
        event(s, actor, "UPDATED", null, null);
        return ShipmentResponse.from(repository.saveAndFlush(s));
    }

    public ShipmentResponse transition(UUID warehouse, UUID id, ShipmentRequests.Status request, UUID actor) {
        var s = locked(warehouse, id);
        if (s.getStatus() == request.status()) return ShipmentResponse.from(s);
        Set<ShipmentStatus> allowed = switch (s.getStatus()) {
            case CREATED -> Set.of(ShipmentStatus.IN_TRANSIT);
            case IN_TRANSIT -> Set.of(ShipmentStatus.DELIVERED, ShipmentStatus.FAILED);
            case FAILED -> Set.of(ShipmentStatus.IN_TRANSIT, ShipmentStatus.RETURNED);
            case DELIVERED, RETURNED -> Set.of();
        };
        if (!allowed.contains(request.status())) conflict("Không thể chuyển từ " + s.getStatus() + " sang " + request.status());
        var previous = s.getStatus();
        s.setStatus(request.status());
        event(s, actor, "STATUS_CHANGED", request.note(), request.location());
        s.getHistory().getLast().put("previousStatus", previous.name());
        return ShipmentResponse.from(repository.saveAndFlush(s));
    }

    public ShipmentResponse collect(UUID warehouse, UUID id, UUID actor) {
        var s = locked(warehouse, id);
        if (s.getCodStatus() == CodStatus.COLLECTED) return ShipmentResponse.from(s);
        if (s.getStatus() != ShipmentStatus.DELIVERED || s.getCodAmount().signum() <= 0)
            conflict("Chỉ xác nhận thu COD dương cho vận đơn đã giao thành công");
        s.setCodStatus(CodStatus.COLLECTED);
        s.setCollectedAt(Instant.now());
        s.setCollectedBy(actor);
        event(s, actor, "COD_COLLECTED", null, null);
        return ShipmentResponse.from(repository.saveAndFlush(s));
    }

    private Shipment locked(UUID warehouse, UUID id) {
        return repository.lock(id, warehouse).orElseThrow(ShipmentService::missing);
    }
    private static ResponseStatusException missing() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy vận đơn trong kho");
    }
    private static void conflict(String message) { throw new ResponseStatusException(HttpStatus.CONFLICT, message); }
    private static String clean(String value) {
        if (value == null || value.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không được để trống hãng hoặc mã vận đơn");
        return value.trim();
    }
    private static void event(Shipment s, UUID actor, String action, String note, String location) {
        var history = s.getHistory() == null ? new ArrayList<Map<String,Object>>() : new ArrayList<>(s.getHistory());
        var item = new LinkedHashMap<String,Object>();
        item.put("action", action); item.put("status", s.getStatus().name());
        item.put("time", Instant.now().toString()); item.put("actorId", actor.toString());
        item.put("carrier", s.getCarrier()); item.put("trackingCode", s.getTrackingCode());
        item.put("codAmount", s.getCodAmount().toPlainString()); item.put("codStatus", s.getCodStatus().name());
        if (note != null) item.put("note", note);
        if (location != null) item.put("location", location);
        history.add(item); s.setHistory(history);
    }
}
