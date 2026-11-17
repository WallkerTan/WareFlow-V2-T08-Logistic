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
            if (instances == null || instances.isEmpty()) {
                log.warn("Không tìm thấy instance nào của inventory-service, bỏ qua snapshot tồn kho");
                return buildEmptySnapshot("inventory-service không khả dụng");
            }

            // Chọn instance đầu tiên (load balancing đơn giản)
            ServiceInstance instance = instances.get(0);
            String baseUrl = instance.getUri().toString();
            String url = baseUrl + "/api/inventory/warehouses/" + warehouseId + "/snapshot";

            RestTemplate restTemplate = new RestTemplate();
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);

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

