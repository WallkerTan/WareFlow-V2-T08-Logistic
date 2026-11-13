package com.example.apigateway;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties={"spring.cloud.config.enabled=false","spring.cloud.discovery.enabled=false","eureka.client.enabled=false","spring.cloud.gateway.server.webflux.discovery.locator.enabled=false"})
class ApiGatewayApplicationTests {
    @org.springframework.beans.factory.annotation.Autowired
    org.springframework.cloud.gateway.route.RouteDefinitionLocator routes;

    @Test
    void contextLoads() {
    }

    @Test
    void allFrontendServicePrefixesHaveGatewayRoutes() {
        var definitions=routes.getRouteDefinitions().collectList().block(java.time.Duration.ofSeconds(5));
        org.junit.jupiter.api.Assertions.assertNotNull(definitions);
        for(String service:java.util.List.of("core","inventory","finance","delivery")) {
            var route=definitions.stream().filter(r->r.getId().equals(service+"-service")).findFirst().orElseThrow();
            org.junit.jupiter.api.Assertions.assertTrue(route.getPredicates().stream().anyMatch(p->p.getName().equals("Path")&&p.getArgs().containsValue("/api/"+service+"/**")));
            org.junit.jupiter.api.Assertions.assertTrue(route.getFilters().stream().anyMatch(f->f.getName().equals("StripPrefix")&&f.getArgs().containsValue("2")));
        }
    }

}
