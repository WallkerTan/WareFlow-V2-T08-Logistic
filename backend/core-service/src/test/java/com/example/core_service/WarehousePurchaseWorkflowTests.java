package com.example.core_service;
import com.example.core_service.dto.response.AuthResponse;
import com.example.core_service.repository.FinanceEventRepository;
import com.example.core_service.client.InventorySnapshotClient;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import tools.jackson.databind.ObjectMapper;
import java.util.*;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")
class WarehousePurchaseWorkflowTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired FinanceEventRepository events;
    @MockitoBean InventorySnapshotClient snapshots;
    String payload(Object value){return json.writeValueAsString(value);}
    String token(String email,String password) throws Exception {
        var r=mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content(payload(Map.of("email",email,"password",password))))
            .andExpect(status().isOk()).andReturn();return "Bearer "+json.readValue(r.getResponse().getContentAsString(),AuthResponse.class).accessToken();
    }
    @Test void approvedPurchaseCreatesFeeAndDurableFinanceEventAndCanBeHandedOver() throws Exception {
        String system=token("admin@wareflow.com","admin123"),email="buyer-"+UUID.randomUUID()+"@test.vn";
        var registered=mvc.perform(post("/auth/register-company").contentType(MediaType.APPLICATION_JSON)
            .content(payload(Map.of("companyName","Buyer "+UUID.randomUUID(),"email",email,"password","12345678","fullName","Buyer","businessModel","FOOD"))))
            .andExpect(status().isCreated()).andReturn();
        var company=json.readValue(registered.getResponse().getContentAsString(),AuthResponse.class);
        mvc.perform(patch("/companies/"+company.companyId()+"/status").header("Authorization",system).contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"ACTIVE\"}")).andExpect(status().isOk());
        String owner=token(email,"12345678");
        var warehouse=mvc.perform(post("/warehouses").header("Authorization",system).contentType(MediaType.APPLICATION_JSON)
            .content(payload(Map.of("name","Warehouse "+UUID.randomUUID(),"warehouseType","BUY","area",100,"price",1000,"region","HCM"))))
            .andExpect(status().isCreated()).andReturn();
        String warehouseId=json.readTree(warehouse.getResponse().getContentAsString()).get("id").asString();
        String warehouseName=json.readTree(warehouse.getResponse().getContentAsString()).get("name").asString();
        mvc.perform(get("/warehouses").header("Authorization",owner).param("search",warehouseName).param("minArea","90").param("maxArea","110").param("minPrice","900").param("maxPrice","1100"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.content[0].id").value(warehouseId));
        mvc.perform(get("/warehouses").header("Authorization",owner).param("minArea","110").param("maxArea","90")).andExpect(status().isBadRequest());
        var proposal=mvc.perform(post("/warehouse-transactions").header("Authorization",owner).contentType(MediaType.APPLICATION_JSON)
            .content(payload(Map.of("warehouseId",warehouseId,"type","BUY","offeredPrice",800))))
            .andExpect(status().isCreated()).andReturn();
        String transactionId=json.readTree(proposal.getResponse().getContentAsString()).get("id").asString();
        mvc.perform(post("/warehouse-transactions/"+transactionId+"/approve").header("Authorization",system)).andExpect(status().isOk())
            .andExpect(jsonPath("$.platformFee").value(40)).andExpect(jsonPath("$.status").value("COMPLETED"));
        var event=events.findById(UUID.fromString(transactionId)).orElseThrow();assertEquals(0,event.getAmount().compareTo(new BigDecimal("800")));assertNull(event.getDeliveredAt());
        mvc.perform(post("/warehouse-transactions/"+transactionId+"/approve").header("Authorization",system)).andExpect(status().isConflict());
        var employee=mvc.perform(post("/employees").header("Authorization",owner).contentType(MediaType.APPLICATION_JSON)
            .content(payload(Map.of("email","manager-"+UUID.randomUUID()+"@test.vn","password","12345678","fullName","Manager"))))
            .andExpect(status().isCreated()).andReturn();
        String managerId=json.readTree(employee.getResponse().getContentAsString()).get("id").asString();
        when(snapshots.getStockSnapshot(UUID.fromString(warehouseId))).thenReturn(Map.of("available",false));
        mvc.perform(post("/warehouse-transactions/"+transactionId+"/handover").header("Authorization",owner).contentType(MediaType.APPLICATION_JSON)
            .content(payload(Map.of("managerId",managerId)))).andExpect(status().isServiceUnavailable());
        when(snapshots.getStockSnapshot(UUID.fromString(warehouseId))).thenReturn(Map.of("available",true,"items",List.of()));
        mvc.perform(post("/warehouse-transactions/"+transactionId+"/handover").header("Authorization",owner).contentType(MediaType.APPLICATION_JSON)
            .content(payload(Map.of("managerId",managerId)))).andExpect(status().isOk());
        mvc.perform(get("/warehouses/"+warehouseId).header("Authorization",owner)).andExpect(status().isOk()).andExpect(jsonPath("$.handover.managerId").value(managerId));
    }
}
