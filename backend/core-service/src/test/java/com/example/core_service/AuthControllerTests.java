package com.example.core_service;

import com.example.core_service.dto.response.AuthResponse;
import com.example.core_service.entity.enums.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.ObjectMapper;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String email;

    @BeforeEach
    void setUp() {
        email = "owner-" + UUID.randomUUID() + "@wareflow.vn";
    }

    @Test
    void registerCompany_thenLogin_thenGetMe() throws Exception {
        // 1. Đăng ký công ty
        String body = objectMapper.writeValueAsString(Map.of(
                "companyName", "Công ty " + UUID.randomUUID(),
                "businessModel", "FOOD",
                "email", email,
                "password", "12345678",
                "fullName", "Nguyễn Văn A",
                "phone", "0900000000"
        ));

        MvcResult registerResult = mockMvc.perform(post("/auth/register-company")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.role").value(UserRole.COMPANY_ADMIN.name()))
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.companyId").isNotEmpty())
                .andReturn();

        String registerToken = objectMapper.readValue(registerResult.getResponse().getContentAsString(), AuthResponse.class)
                .accessToken();
        assertThat(registerToken).isNotBlank();

        // 2. Đăng nhập
        String loginBody = objectMapper.writeValueAsString(Map.of(
                "email", email,
                "password", "12345678"
        ));

        MvcResult loginResult = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.expiresAt").isNotEmpty())
                .andReturn();

        String token = objectMapper.readValue(loginResult.getResponse().getContentAsString(), AuthResponse.class)
                .accessToken();
        assertThat(token).isNotBlank();

        // 3. Gọi /auth/me với Bearer token
        mockMvc.perform(get("/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.companyName").isNotEmpty());

        // 4. Không token -> 401
        mockMvc.perform(get("/auth/me"))
                .andExpect(status().isUnauthorized());

        // 5. Token sai -> 401
        mockMvc.perform(get("/auth/me").header("Authorization", "Bearer invalid.token.value"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void registerCompany_duplicateEmail_returnsConflict() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "companyName", "Công ty " + UUID.randomUUID(),
                "businessModel", "TECH",
                "email", email,
                "password", "12345678",
                "fullName", "Trần Thị B"
        ));

        mockMvc.perform(post("/auth/register-company")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/auth/register-company")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Email đã được đăng ký"));
    }

    @Test
    void login_wrongPassword_returnsUnauthorized() throws Exception {
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email,
                                "password", "wrong-password"
                        ))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void registerCompany_invalidPayload_returnsBadRequest() throws Exception {
        mockMvc.perform(post("/auth/register-company")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "companyName", "",
                                "email", "not-an-email",
                                "password", "123"
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void login_malformedJson_returnsBadRequest() throws Exception {
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ this is not json }"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void me_withoutToken_returnsJsonBody401() throws Exception {
        mockMvc.perform(get("/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.path").value("/auth/me"));
    }
}
