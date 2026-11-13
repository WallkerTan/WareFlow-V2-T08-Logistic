package com.example.delivery_service;

import com.example.delivery_service.controller.*;
import com.example.delivery_service.security.WarehouseAccessService;
import com.example.delivery_service.service.ShipmentService;
import org.junit.jupiter.api.*;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.UUID;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ShipmentHttpTests {
    MockMvc mvc;
    ShipmentService service;
    final String path="/warehouses/"+UUID.randomUUID()+"/shipments";
    @BeforeEach void setup() {
        service=mock(ShipmentService.class);
        mvc=MockMvcBuilders.standaloneSetup(new ShipmentController(service,mock(WarehouseAccessService.class)))
            .setControllerAdvice(new ApiExceptionHandler()).build();
    }
    @Test void negativeAndOverPrecisionCodRejected() throws Exception {
        for (String amount : new String[]{"-1","1.001","10000000000000"}) {
            mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(
                "{\"documentId\":\""+UUID.randomUUID()+"\",\"carrier\":\"GHN\",\"trackingCode\":\"123\",\"codAmount\":"+amount+"}"))
                .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(service);
    }
    @Test void missingFieldsAndUnknownStatusRejected() throws Exception {
        mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isBadRequest());
        mvc.perform(patch(path+"/"+UUID.randomUUID()+"/status").contentType(MediaType.APPLICATION_JSON)
            .content("{\"status\":\"UNKNOWN\"}")).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
    @Test void paginationBoundsRejected() throws Exception {
        mvc.perform(get(path).param("page","-1")).andExpect(status().isBadRequest());
        mvc.perform(get(path).param("size","101")).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
}
