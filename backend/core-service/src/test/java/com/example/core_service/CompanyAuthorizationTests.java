package com.example.core_service;

import com.example.core_service.dto.response.AuthResponse;
import com.example.core_service.entity.enums.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CompanyAuthorizationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String companyAdminToken;
    private String otherCompanyAdminToken;
    private String systemAdminToken;
    private String warehouseManagerToken;
    private String companyId;
    private String otherCompanyId;

    @BeforeEach
    void setUp() throws Exception {
        AuthResponse firstCompany = registerCompany("first");
        AuthResponse secondCompany = registerCompany("second");
        companyAdminToken = firstCompany.accessToken();
        companyId = firstCompany.companyId().toString();
        otherCompanyAdminToken = secondCompany.accessToken();
        otherCompanyId = secondCompany.companyId().toString();
        systemAdminToken = login("admin@wareflow.com", "admin123");
        warehouseManagerToken = registerWarehouseManager();
    }

    @Test
    void systemAdmin_canListAndViewAnyCompany() throws Exception {
        mockMvc.perform(get("/companies").header("Authorization", bearer(systemAdminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());

        mockMvc.perform(get("/companies/{id}", companyId)
                        .header("Authorization", bearer(systemAdminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(companyId));
    }

    @Test
    void companyAdmin_canViewOwnCompanyButNotOtherCompany() throws Exception {
        mockMvc.perform(get("/companies/my-company")
                        .header("Authorization", bearer(companyAdminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(companyId));

        mockMvc.perform(get("/companies/{id}", companyId)
                        .header("Authorization", bearer(companyAdminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(companyId));

        mockMvc.perform(get("/companies/{id}", otherCompanyId)
                        .header("Authorization", bearer(companyAdminToken)))
                .andExpect(status().isForbidden());
    }

    @Test
    void warehouseManager_cannotAccessCompanyAdminEndpoints() throws Exception {
        mockMvc.perform(get("/companies/my-company")
                        .header("Authorization", bearer(warehouseManagerToken)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/companies")
                        .header("Authorization", bearer(warehouseManagerToken)))
                .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticatedUser_cannotAccessCompanyEndpoints() throws Exception {
        mockMvc.perform(get("/companies"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/companies/my-company"))
                .andExpect(status().isUnauthorized());
    }

    private AuthResponse registerCompany(String prefix) throws Exception {
        String email = prefix + "-" + UUID.randomUUID() + "@wareflow.vn";
        MvcResult result = mockMvc.perform(post("/auth/register-company")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "companyName", "Company " + UUID.randomUUID(),
                                "businessModel", "TECH",
                                "email", email,
                                "password", "12345678",
                                "fullName", "Test Company Admin"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value(UserRole.COMPANY_ADMIN.name()))
                .andReturn();
        return objectMapper.readValue(result.getResponse().getContentAsString(), AuthResponse.class);
    }

    private String login(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", email, "password", password))))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readValue(result.getResponse().getContentAsString(), AuthResponse.class).accessToken();
    }

    private String registerWarehouseManager() throws Exception {
        String email = "manager-" + UUID.randomUUID() + "@wareflow.vn";
        MvcResult result = mockMvc.perform(post("/auth/register-warehouse-manager")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email,
                                "password", "12345678",
                                "fullName", "Test Warehouse Manager",
                                "profileType", "INDIVIDUAL",
                                "role", UserRole.WAREHOUSE_MANAGER.name(),
                                "individualProfile", Map.of("phone", "0900000000")
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readValue(result.getResponse().getContentAsString(), AuthResponse.class).accessToken();
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }
}
