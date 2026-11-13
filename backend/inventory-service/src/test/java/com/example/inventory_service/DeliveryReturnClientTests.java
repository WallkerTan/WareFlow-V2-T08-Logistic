package com.example.inventory_service;

import com.example.inventory_service.service.DeliveryReturnClient;
import org.junit.jupiter.api.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class DeliveryReturnClientTests {
    UUID warehouse=UUID.randomUUID(),shipment=UUID.randomUUID(),sale=UUID.randomUUID();
    DeliveryReturnClient client;MockRestServiceServer server;
    @BeforeEach void setup(){
        var builder=RestClient.builder().baseUrl("http://delivery");server=MockRestServiceServer.bindTo(builder).build();
        client=new DeliveryReturnClient("http://delivery");ReflectionTestUtils.setField(client,"client",builder.build());
    }
    String body(String status,UUID ownerWarehouse){return "{\"id\":\""+shipment+"\",\"warehouseId\":\""+ownerWarehouse+"\",\"documentId\":\""+sale+"\",\"status\":\""+status+"\"}";}
    @Test void validatesReturnedShipmentAndForwardsCallerToken(){
        server.expect(requestTo("http://delivery/warehouses/"+warehouse+"/shipments/"+shipment)).andExpect(header("Authorization","Bearer caller"))
                .andRespond(withSuccess(body("RETURNED",warehouse),MediaType.APPLICATION_JSON));
        assertEquals(sale,client.requireReturned("Bearer caller",warehouse,shipment).documentId());server.verify();
    }
    @Test void deliveredShipmentCannotBeRestocked(){
        server.expect(anything()).andRespond(withSuccess(body("DELIVERED",warehouse),MediaType.APPLICATION_JSON));
        assertEquals(409,assertThrows(ResponseStatusException.class,()->client.requireReturned("Bearer caller",warehouse,shipment)).getStatusCode().value());
    }
    @Test void shipmentFromAnotherWarehouseIsRejected(){
        server.expect(anything()).andRespond(withSuccess(body("RETURNED",UUID.randomUUID()),MediaType.APPLICATION_JSON));
        assertEquals(409,assertThrows(ResponseStatusException.class,()->client.requireReturned("Bearer caller",warehouse,shipment)).getStatusCode().value());
    }
    @Test void deliveryOutageReturns503(){
        server.expect(anything()).andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));
        assertEquals(503,assertThrows(ResponseStatusException.class,()->client.requireReturned("Bearer caller",warehouse,shipment)).getStatusCode().value());
    }
}
