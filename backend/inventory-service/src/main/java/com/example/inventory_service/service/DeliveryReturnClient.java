package com.example.inventory_service.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;
import java.util.UUID;

@Service
public class DeliveryReturnClient {
    private final RestClient client;
    public DeliveryReturnClient(@Value("${DELIVERY_SERVICE_URL:http://localhost:8084}") String url) {
        var factory=new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);factory.setReadTimeout(10000);
        client=RestClient.builder().baseUrl(url).requestFactory(factory).build();
    }
    public record ReturnedShipment(UUID id, UUID warehouseId, UUID documentId, String status) {}
    public ReturnedShipment requireReturned(String token, UUID warehouse, UUID shipment) {
        try {
            var result=client.get().uri("/warehouses/{warehouse}/shipments/{id}",warehouse,shipment)
                    .header("Authorization",token).retrieve().body(ReturnedShipment.class);
            if(result==null || !shipment.equals(result.id()) || !warehouse.equals(result.warehouseId()) || !"RETURNED".equals(result.status()))
                throw new ResponseStatusException(HttpStatus.CONFLICT,"Chỉ nhập hoàn khi vận đơn đã RETURNED");
            return result;
        } catch(RestClientResponseException ex) {
            throw new ResponseStatusException(ex.getStatusCode().is4xxClientError()?ex.getStatusCode():HttpStatus.SERVICE_UNAVAILABLE,"Không xác minh được vận đơn hoàn");
        } catch(org.springframework.web.client.RestClientException ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Chưa kết nối được delivery-service để nhập hàng hoàn");
        }
    }
}
