package com.example.core_service.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.client.ServiceInstance;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Client gọi inventory-service để lấy snapshot tồn kho tại thời điểm bàn giao.
 * Nếu inventory-service không khả dụng, trả về snapshot rỗng kèm ghi chú.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class InventorySnapshotClient {

    private final DiscoveryClient discoveryClient;
    @org.springframework.beans.factory.annotation.Value("${INVENTORY_SERVICE_URL:http://localhost:8082}")
    private String inventoryUrl;

    /**
     * Lấy danh sách sản phẩm/tồn kho hiện tại của kho từ inventory-service.
     *
     * @param warehouseId ID của kho cần lấy snapshot
     * @return Map chứa dữ liệu snapshot hoặc map rỗng nếu lỗi
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getStockSnapshot(UUID warehouseId) {
        try {
            List<ServiceInstance> instances = discoveryClient.getInstances("inventory-service");
            String baseUrl = instances == null || instances.isEmpty() ? inventoryUrl : instances.getFirst().getUri().toString();
            String url = baseUrl + "/warehouses/" + warehouseId + "/snapshot";

            RestTemplate restTemplate = new RestTemplate();
            var factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(5000); factory.setReadTimeout(10000);
            restTemplate.setRequestFactory(factory);
            var headers = new org.springframework.http.HttpHeaders();
            var attributes = org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
            if (attributes instanceof org.springframework.web.context.request.ServletRequestAttributes servlet) {
                String authorization=servlet.getRequest().getHeader("Authorization");
                if(authorization!=null) headers.set("Authorization", authorization);
            }
            Map<String,Object> response=restTemplate.exchange(url,org.springframework.http.HttpMethod.GET,
                    new org.springframework.http.HttpEntity<>(headers),Map.class).getBody();

            if (response != null) {
                log.info("Lấy snapshot tồn kho thành công từ inventory-service cho warehouseId={}", warehouseId);
                return response;
            }
            return buildEmptySnapshot("Dữ liệu trả về trống");

        } catch (RestClientException e) {
            log.warn("Lỗi khi gọi inventory-service để lấy snapshot kho={}: {}", warehouseId, e.getMessage());
            return buildEmptySnapshot("Lỗi kết nối: " + e.getMessage());
        } catch (Exception e) {
            log.error("Lỗi không mong đợi khi lấy snapshot kho={}: {}", warehouseId, e.getMessage());
            return buildEmptySnapshot("Lỗi hệ thống khi lấy tồn kho");
        }
    }

    private Map<String, Object> buildEmptySnapshot(String reason) {
        Map<String, Object> snapshot = new HashMap<>();
        snapshot.put("available", false);
        snapshot.put("reason", reason);
        snapshot.put("items", List.of());
        snapshot.put("totalItems", 0);
        return snapshot;
    }
}
