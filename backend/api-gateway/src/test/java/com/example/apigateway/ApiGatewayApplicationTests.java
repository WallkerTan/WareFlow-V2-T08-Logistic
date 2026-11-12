package com.example.apigateway;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties={"spring.cloud.config.enabled=false","spring.cloud.discovery.enabled=false","eureka.client.enabled=false","spring.cloud.gateway.server.webflux.discovery.locator.enabled=false"})
class ApiGatewayApplicationTests {

    @Test
    void contextLoads() {
    }

}
