package com.example.delivery_service.client;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.UUID;

@Component
public class InventoryClient {
    private final RestClient client;
    public InventoryClient(@Qualifier("inventoryRestClient") RestClient client) { this.client = client; }
    public void requireCompletedSale(String token, UUID warehouseId, UUID documentId) {
        try {
            var document = client.get().uri("/warehouses/{warehouseId}/exports/{id}", warehouseId, documentId)
                .header(HttpHeaders.AUTHORIZATION, token).retrieve().body(ExportDocument.class);
            if (document == null || !documentId.equals(document.id()) || !warehouseId.equals(document.warehouseId()))
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phiếu xuất trong kho");
            if (!"EXPORT_SALE".equals(document.type()) || !"DONE".equals(document.status()))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Chỉ tạo vận đơn cho phiếu xuất bán đã hoàn tất");
        } catch (RestClientResponseException ex) {
            int code = ex.getStatusCode().value();
            throw new ResponseStatusException(code == 401 || code == 403 || code == 404 ?
                HttpStatus.valueOf(code) : HttpStatus.SERVICE_UNAVAILABLE, "Không thể xác minh phiếu xuất");
        } catch (RestClientException ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Không thể kết nối inventory-service");
        }
    }
    public record ExportDocument(UUID id, UUID warehouseId, String type, String status) {}
}
