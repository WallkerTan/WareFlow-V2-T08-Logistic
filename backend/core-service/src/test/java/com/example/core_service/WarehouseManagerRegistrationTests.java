package com.example.core_service;

import com.example.core_service.dto.response.AuthResponse;
import com.example.core_service.entity.enums.CompanyStatus;
import com.example.core_service.repository.CompanyRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import tools.jackson.databind.ObjectMapper;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")
class WarehouseManagerRegistrationTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired CompanyRepository companies;
    String encode(Object value){return json.writeValueAsString(value);}
    AuthResponse login(String email) throws Exception {
        var result=mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content(encode(Map.of("email",email,"password","12345678"))))
            .andExpect(status().isOk()).andReturn();
        return json.readValue(result.getResponse().getContentAsString(),AuthResponse.class);
    }
    AuthResponse company() throws Exception {
        String email="owner-"+UUID.randomUUID()+"@test.vn";
        var result=mvc.perform(post("/auth/register-company").contentType(MediaType.APPLICATION_JSON)
            .content(encode(Map.of("companyName","Company "+UUID.randomUUID(),"businessModel","FOOD","email",email,"password","12345678","fullName","Owner"))))
            .andExpect(status().isCreated()).andReturn();
        AuthResponse r=json.readValue(result.getResponse().getContentAsString(),AuthResponse.class);
        var c=companies.findById(r.companyId()).orElseThrow();c.setStatus(CompanyStatus.ACTIVE);companies.save(c);
        return login(email);
    }
    String bearer(AuthResponse r){return "Bearer "+r.accessToken();}
    Map<String,Object> employee(AuthResponse owner,String email) throws Exception {
        var result=mvc.perform(post("/employees").header("Authorization",bearer(owner)).contentType(MediaType.APPLICATION_JSON)
            .content(encode(Map.of("email",email,"password","12345678","fullName","Warehouse Manager"))))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.companyId").value(owner.companyId().toString()))
            .andExpect(jsonPath("$.passwordHash").doesNotExist()).andReturn();
        return json.readValue(result.getResponse().getContentAsString(),Map.class);
    }
    @Test void selfRegistrationIsClosed() throws Exception {
        mvc.perform(post("/auth/register-warehouse-manager").contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isUnauthorized());
        var owner=company();
        mvc.perform(post("/auth/register-warehouse-manager").header("Authorization",bearer(owner)).contentType(MediaType.APPLICATION_JSON)
            .content(encode(Map.of("email","closed@test.vn","password","12345678","fullName","Closed"))))
            .andExpect(status().isForbidden());
    }
    @Test void employeeCanLoginButCannotCreateEmployees() throws Exception {
        var owner=company();String email="manager-"+UUID.randomUUID()+"@test.vn";employee(owner,email);var manager=login(email);
        mvc.perform(get("/users/me").header("Authorization",bearer(manager))).andExpect(status().isOk())
            .andExpect(jsonPath("$.role").value("WAREHOUSE_MANAGER")).andExpect(jsonPath("$.passwordHash").doesNotExist());
        mvc.perform(get("/employees").header("Authorization",bearer(manager))).andExpect(status().isForbidden());
    }
    @Test void employeeCannotBeChangedByAnotherCompanyAndLockInvalidatesToken() throws Exception {
        var owner=company();var other=company();String email="manager-"+UUID.randomUUID()+"@test.vn";
        var employee=employee(owner,email);var manager=login(email);String id=employee.get("id").toString();
        String payload=encode(Map.of("fullName","Changed","status","LOCKED"));
        mvc.perform(patch("/employees/"+id).header("Authorization",bearer(other)).contentType(MediaType.APPLICATION_JSON).content(payload)).andExpect(status().isForbidden());
        mvc.perform(patch("/employees/"+id).header("Authorization",bearer(owner)).contentType(MediaType.APPLICATION_JSON).content(payload)).andExpect(status().isOk());
        mvc.perform(get("/users/me").header("Authorization",bearer(manager))).andExpect(status().isForbidden());
    }
    @Test void customerIsScopedToCompany() throws Exception {
        var owner=company();var other=company();
        var result=mvc.perform(post("/customers").header("Authorization",bearer(owner)).contentType(MediaType.APPLICATION_JSON)
            .content(encode(Map.of("name","Customer")))).andExpect(status().isCreated()).andReturn();
        var data=json.readValue(result.getResponse().getContentAsString(),Map.class);
        mvc.perform(get("/customers/"+data.get("id")).header("Authorization",bearer(other))).andExpect(status().isForbidden());
        mvc.perform(get("/customers").header("Authorization",bearer(other))).andExpect(status().isOk()).andExpect(jsonPath("$.content").isEmpty());
    }
    @Test void pendingCompanyRequiresSystemApproval() throws Exception {
        String email="pending-"+UUID.randomUUID()+"@test.vn";
        var result=mvc.perform(post("/auth/register-company").contentType(MediaType.APPLICATION_JSON)
            .content(encode(Map.of("companyName","Pending "+UUID.randomUUID(),"businessDescription","Thuc pham","email",email,"password","12345678","fullName","Owner"))))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.accessToken").doesNotExist()).andReturn();
        var pending=json.readValue(result.getResponse().getContentAsString(),AuthResponse.class);
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content(encode(Map.of("email",email,"password","12345678"))))
            .andExpect(status().isForbidden());
        var admin=mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content(encode(Map.of("email","admin@wareflow.com","password","admin123"))))
            .andExpect(status().isOk()).andReturn();
        var token=json.readValue(admin.getResponse().getContentAsString(),AuthResponse.class);
        mvc.perform(patch("/companies/"+pending.companyId()+"/status").header("Authorization",bearer(token)).contentType(MediaType.APPLICATION_JSON)
            .content(encode(Map.of("status","ACTIVE")))).andExpect(status().isOk()).andExpect(jsonPath("$.businessModel").value("FOOD"));
        assertNotNull(login(email).accessToken());
    }
    @Test void supplierCatalogIsManagedBySystemAndFilteredByCompanyIndustry() throws Exception {
        var owner=company();
        var adminResult=mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content(encode(Map.of("email","admin@wareflow.com","password","admin123"))))
            .andExpect(status().isOk()).andReturn();
        var admin=json.readValue(adminResult.getResponse().getContentAsString(),AuthResponse.class);
        String food=null,tech=null;
        for(String model:List.of("FOOD","TECH")){
            var created=mvc.perform(post("/suppliers").header("Authorization",bearer(admin)).contentType(MediaType.APPLICATION_JSON)
                .content(encode(Map.of("name","Supplier "+UUID.randomUUID(),"businessModel",model))))
                .andExpect(status().isCreated()).andReturn();
            String id=json.readTree(created.getResponse().getContentAsString()).get("id").asString();if(model.equals("FOOD"))food=id;else tech=id;
        }
        mvc.perform(get("/suppliers/"+food).header("Authorization",bearer(owner))).andExpect(status().isOk());
        mvc.perform(get("/suppliers/"+tech).header("Authorization",bearer(owner))).andExpect(status().isForbidden());
        mvc.perform(post("/suppliers").header("Authorization",bearer(owner)).contentType(MediaType.APPLICATION_JSON)
            .content(encode(Map.of("name","Unauthorized","businessModel","FOOD")))).andExpect(status().isForbidden());
        String product=encode(Map.of("sku","SKU-1","name","Supplier item","unit","box","price",100));
        mvc.perform(post("/suppliers/"+food+"/products").header("Authorization",bearer(admin)).contentType(MediaType.APPLICATION_JSON).content(product)).andExpect(status().isCreated());
        mvc.perform(post("/suppliers/"+food+"/products").header("Authorization",bearer(admin)).contentType(MediaType.APPLICATION_JSON).content(product)).andExpect(status().isConflict());
    }
}
