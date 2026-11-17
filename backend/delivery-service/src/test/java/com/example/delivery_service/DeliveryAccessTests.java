package com.example.delivery_service;

import com.example.delivery_service.client.InventoryClient;
import com.example.delivery_service.security.WarehouseAccessService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.*;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class DeliveryAccessTests {
    final String secret="Y3Vyb3VyZS1uZWVkcy1hLXNlY3JldC1rZXktbWluaW11bS0zMi1ieXRlcy1sb25nISE=";
    final UUID warehouse=UUID.randomUUID(), user=UUID.randomUUID(), company=UUID.randomUUID(), document=UUID.randomUUID();
    MockRestServiceServer server;
    RestClient client;
    WarehouseAccessService access;
    @BeforeEach void setup() {
        var builder=RestClient.builder().baseUrl("http://service");
        server=MockRestServiceServer.bindTo(builder).build();
        client=builder.build();
        access=new WarehouseAccessService(secret,"wareflow-auth",client);
    }
    String token(String role, boolean expired) {
        return "Bearer "+Jwts.builder().subject(user.toString()).issuer("wareflow-auth")
            .claim("role",role).claim("companyId",company.toString())
            .expiration(Date.from(Instant.now().plusSeconds(expired ? -60 : 600)))
            .signWith(Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret))).compact();
    }
    @Test void missingAndExpiredTokensRejected() {
        assertEquals(401,assertThrows(ResponseStatusException.class,()->access.authorize(null,warehouse,false)).getStatusCode().value());
        assertEquals(401,assertThrows(ResponseStatusException.class,()->access.authorize(token("WAREHOUSE_MANAGER",true),warehouse,true)).getStatusCode().value());
    }
    @Test void managerMustBeAssignedToWarehouse() {
        server.expect(requestTo("http://service/warehouses/"+warehouse)).andRespond(withSuccess(
            "{\"id\":\""+warehouse+"\",\"handover\":{\"managerId\":\""+user+"\"}}",MediaType.APPLICATION_JSON));
        assertEquals(user,access.authorize(token("WAREHOUSE_MANAGER",false),warehouse,true));
        server.verify();
    }
    @Test void companyCannotAccessOtherCompanyWarehouse() {
        server.expect(anything()).andRespond(withSuccess(
            "{\"id\":\""+warehouse+"\",\"ownerCompanyId\":\""+UUID.randomUUID()+"\"}",MediaType.APPLICATION_JSON));
        assertEquals(403,assertThrows(ResponseStatusException.class,()->access.authorize(token("COMPANY_ADMIN",false),warehouse,true)).getStatusCode().value());
    }
    @Test void systemAdminReadOnlyAndCoreFailureClosed() {
        assertEquals(user,access.authorize(token("SYSTEM_ADMIN",false),warehouse,false));
        assertEquals(403,assertThrows(ResponseStatusException.class,()->access.authorize(token("SYSTEM_ADMIN",false),warehouse,true)).getStatusCode().value());
        server.expect(anything()).andRespond(withServerError());
        assertEquals(503,assertThrows(ResponseStatusException.class,()->access.authorize(token("COMPANY_ADMIN",false),warehouse,true)).getStatusCode().value());
    }
    @Test void inventoryValidatesWarehouseTypeAndStatus() {
        server.expect(anything()).andRespond(withSuccess(export(warehouse,"EXPORT_SALE","DONE"),MediaType.APPLICATION_JSON));
        new InventoryClient(client).requireCompletedSale("Bearer token",warehouse,document);
        server.verify();
    }
    @Test void inventoryRejectsWrongWarehouse() {
        server.expect(anything()).andRespond(withSuccess(export(UUID.randomUUID(),"EXPORT_SALE","DONE"),MediaType.APPLICATION_JSON));
        assertEquals(404,assertThrows(ResponseStatusException.class,()->new InventoryClient(client)
            .requireCompletedSale("token",warehouse,document)).getStatusCode().value());
    }
    @Test void inventoryRejectsUnfinishedExport() {
        server.expect(anything()).andRespond(withSuccess(export(warehouse,"EXPORT_SALE","APPROVED"),MediaType.APPLICATION_JSON));
        assertEquals(409,assertThrows(ResponseStatusException.class,()->new InventoryClient(client)
            .requireCompletedSale("token",warehouse,document)).getStatusCode().value());
    }
    @Test void inventoryRejectsWrongType() {
        server.expect(anything()).andRespond(withSuccess(export(warehouse,"EXPORT_TRANSFER","DONE"),MediaType.APPLICATION_JSON));
        assertEquals(409,assertThrows(ResponseStatusException.class,()->new InventoryClient(client)
            .requireCompletedSale("token",warehouse,document)).getStatusCode().value());
    }
    @Test void inventoryUnavailable() {
        server.expect(anything()).andRespond(withServerError());
        assertEquals(503,assertThrows(ResponseStatusException.class,()->new InventoryClient(client)
            .requireCompletedSale("token",warehouse,document)).getStatusCode().value());
    }
    String export(UUID w,String type,String status) {
        return "{\"id\":\""+document+"\",\"warehouseId\":\""+w+"\",\"type\":\""+type+"\",\"status\":\""+status+"\"}";
    }
}
