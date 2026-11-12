package com.example.inventory_service.service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import java.util.*;
@Component @RequiredArgsConstructor @Slf4j
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name="wareflow.alerts.enabled",havingValue="true",matchIfMissing=true)
public class InventoryAlertWorker {
    private final JdbcTemplate jdbc;
    private final InventoryQueryService inventory;
    @Value("${INTERNAL_API_KEY:}") private String key;
    @Value("${wareflow.core-service-url:http://localhost:8081}") private String coreUrl;
    @Scheduled(fixedDelayString="${wareflow.alerts.interval-ms:900000}")
    public void scan(){
        if(key.isBlank())return;
        var factory=new org.springframework.http.client.SimpleClientHttpRequestFactory();factory.setConnectTimeout(5000);factory.setReadTimeout(10000);
        var client=RestClient.builder().baseUrl(coreUrl).requestFactory(factory).build();
        for(UUID warehouse:jdbc.query("select distinct warehouse_id from products where deleted_at is null",(r,n)->r.getObject(1,UUID.class))){
            for(var a:inventory.alerts(warehouse)){
                Map<String,Object> body=new HashMap<>();body.put("warehouseId",warehouse);body.put("productId",a.productId());body.put("lotId",a.lotId());body.put("sku",a.sku());body.put("type",a.type());
                try{client.post().uri("/internal/inventory-alerts").header("X-Internal-Key",key).body(body).retrieve().toBodilessEntity();}
                catch(Exception ex){log.warn("Inventory alert for warehouse {} will retry on next scan",warehouse);}
            }
        }
    }
}
