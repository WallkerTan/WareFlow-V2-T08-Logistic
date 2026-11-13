package com.example.inventory_service;
import com.example.inventory_service.security.WarehouseAccessService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.*;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.MediaType;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;
class WarehouseAccessTests {
    String secret="Y3Vyb3VyZS1uZWVkcy1hLXNlY3JldC1rZXktbWluaW11bS0zMi1ieXRlcy1sb25nISE=";
    UUID user=UUID.randomUUID(),company=UUID.randomUUID(),warehouse=UUID.randomUUID();
    WarehouseAccessService access;
    MockRestServiceServer core;
    @BeforeEach void setup(){
        var builder=RestClient.builder().baseUrl("http://core");core=MockRestServiceServer.bindTo(builder).build();
        access=new WarehouseAccessService(secret,"wareflow-auth","http://core");ReflectionTestUtils.setField(access,"coreClient",builder.build());
    }
    String token(String role){return "Bearer "+Jwts.builder().subject(user.toString()).issuer("wareflow-auth").claim("role",role)
        .claim("companyId",company.toString()).expiration(Date.from(Instant.now().plusSeconds(600))).signWith(Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret))).compact();}
    String scope(UUID owner){return "{\"id\":\""+warehouse+"\",\"ownerCompanyId\":\""+owner+"\",\"name\":\"Warehouse\",\"handover\":{\"managerId\":\""+user+"\",\"managerName\":\"Manager\"}}";}
    @Test void assignedManagerCanReadTypedWarehouseResponse(){
        core.expect(requestTo("http://core/warehouses/"+warehouse)).andRespond(withSuccess(scope(company),MediaType.APPLICATION_JSON));
        assertEquals(user,access.authorize(token("WAREHOUSE_MANAGER"),warehouse,false).id());core.verify();
    }
    @Test void staleAssignmentInAnotherCompanyDoesNotGrantAccess(){
        core.expect(anything()).andRespond(withSuccess(scope(UUID.randomUUID()),MediaType.APPLICATION_JSON));
        assertEquals(403,assertThrows(ResponseStatusException.class,()->access.authorize(token("WAREHOUSE_MANAGER"),warehouse,false)).getStatusCode().value());
    }
    @Test void systemAdminTokenStillRequiresActiveAccount(){
        core.expect(requestTo("http://core/auth/me")).andRespond(withStatus(org.springframework.http.HttpStatus.FORBIDDEN));
        assertEquals(403,assertThrows(ResponseStatusException.class,()->access.authorize(token("SYSTEM_ADMIN"),warehouse,false)).getStatusCode().value());
    }
    @Test void snapshotAccessWithoutTokenIsRejected(){
        assertEquals(401,assertThrows(ResponseStatusException.class,()->access.authorize(null,warehouse,false)).getStatusCode().value());
    }
    @Test void managerCanTransferToAnotherManagerInSameCompany(){
        UUID target=UUID.randomUUID();
        core.expect(requestTo("http://core/warehouses/"+warehouse)).andRespond(withSuccess(scope(company),MediaType.APPLICATION_JSON));
        core.expect(requestTo("http://core/warehouses/"+warehouse)).andRespond(withSuccess(scope(company),MediaType.APPLICATION_JSON));
        core.expect(requestTo("http://core/warehouses/"+target)).andRespond(withSuccess("{\"id\":\""+target+"\",\"ownerCompanyId\":\""+company+"\",\"handover\":{\"managerId\":\""+UUID.randomUUID()+"\"}}",MediaType.APPLICATION_JSON));
        assertEquals(user,access.authorizeTransfer(token("WAREHOUSE_MANAGER"),warehouse,target).id());core.verify();
    }
    @Test void transferCannotCrossCompanyBoundary(){
        UUID target=UUID.randomUUID();
        core.expect(requestTo("http://core/warehouses/"+warehouse)).andRespond(withSuccess(scope(company),MediaType.APPLICATION_JSON));
        core.expect(requestTo("http://core/warehouses/"+warehouse)).andRespond(withSuccess(scope(company),MediaType.APPLICATION_JSON));
        core.expect(requestTo("http://core/warehouses/"+target)).andRespond(withSuccess(scope(UUID.randomUUID()),MediaType.APPLICATION_JSON));
        assertEquals(403,assertThrows(ResponseStatusException.class,()->access.authorizeTransfer(token("WAREHOUSE_MANAGER"),warehouse,target)).getStatusCode().value());core.verify();
    }
}
