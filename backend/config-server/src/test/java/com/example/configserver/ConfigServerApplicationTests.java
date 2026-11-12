package com.example.configserver;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties={"eureka.client.enabled=false","spring.profiles.active=native"})
class ConfigServerApplicationTests {

    @Test
    void contextLoads() {
    }

}
