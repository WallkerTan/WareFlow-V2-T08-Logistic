package com.example.delivery_service.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import java.time.Duration;

@Configuration
public class DeliveryClients {
    private RestClient client(String url, int timeout) {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(timeout));
        factory.setReadTimeout(Duration.ofMillis(timeout));
        return RestClient.builder().baseUrl(url).requestFactory(factory).build();
    }
    @Bean("coreClient")
    RestClient core(@Value("${wareflow.core-service-url}") String url,
        @Value("${wareflow.http-timeout-ms:5000}") int timeout) { return client(url, timeout); }
    @Bean("inventoryRestClient")
    RestClient inventory(@Value("${wareflow.inventory-service-url}") String url,
        @Value("${wareflow.http-timeout-ms:5000}") int timeout) { return client(url, timeout); }
}
