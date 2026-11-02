package com.example.core_service;

import com.example.core_service.dto.response.AuthResponse;
import com.example.core_service.entity.Company;
import com.example.core_service.entity.User;
import com.example.core_service.entity.enums.ProfileType;
import com.example.core_service.entity.enums.UserRole;
import com.example.core_service.repository.CompanyRepository;
import com.example.core_service.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.ObjectMapper;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class WarehouseManagerRegistrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CompanyRepository companyRepository;

    /**
     * Spy để ép lỗi khi lưu user, kiểm tra transaction rollback cả hồ sơ công ty.
     */
    @MockitoSpyBean
    private UserRepository spiedUserRepository;

    private String email;

    /**
     * Mã số thuế 10 chữ số, duy nhất cho mỗi test để không đụng dữ liệu đã lưu trong DB.
     */
    private String taxCode;

    @BeforeEach
    void setUp() {
        email = "manager-" + UUID.randomUUID() + "@wareflow.vn";
        taxCode = String.format("%010d", Math.abs(UUID.randomUUID().getMostSignificantBits() % 10000000000L));
    }

    @Test
    void registerWarehouseManager_withCompanyProfile_thenLogin_thenGetMe() throws Exception {
        // 1. Đăng ký tài khoản WAREHOUSE_MANAGER kèm hồ sơ công ty
        Map<String, Object> payload = new HashMap<>();
        payload.put("email", email);
        payload.put("password", "12345678");
        payload.put("fullName", "Trần Quản Lý");
        payload.put("profileType", ProfileType.COMPANY.name());
        payload.put("role", UserRole.WAREHOUSE_MANAGER.name());
        payload.put("companyProfile", Map.of(
                "companyName", "Công ty " + UUID.randomUUID(),
                "businessModel", "FOOD",
                "taxCode", taxCode,
                "phone", "0900000000",
                "address", "HCM"
        ));

        MvcResult registerResult = mockMvc.perform(post("/auth/register-warehouse-manager")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.role").value(UserRole.WAREHOUSE_MANAGER.name()))
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.companyId").isNotEmpty())
                .andExpect(jsonPath("$.companyName").isNotEmpty())
                // Không rò rỉ mật khẩu / hash
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andReturn();

        String token = objectMapper.readValue(registerResult.getResponse().getContentAsString(), AuthResponse.class)
                .accessToken();
        assertThat(token).isNotBlank();

        // 2. Đăng nhập được ngay với tài khoản vừa tạo
        MvcResult loginResult = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email,
                                "password", "12345678"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value(UserRole.WAREHOUSE_MANAGER.name()))
                .andReturn();

        String loginToken = objectMapper.readValue(loginResult.getResponse().getContentAsString(), AuthResponse.class)
                .accessToken();

        // 3. /auth/me xác nhận đúng role + company
        mockMvc.perform(get("/auth/me").header("Authorization", "Bearer " + loginToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.role").value(UserRole.WAREHOUSE_MANAGER.name()))
                .andExpect(jsonPath("$.companyId").isNotEmpty());
    }

    @Test
    void registerWarehouseManager_withIndividualProfile_createsUserWithoutCompany() throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("email", email);
        payload.put("password", "12345678");
        payload.put("fullName", "Nguyễn Cá Nhân");
        payload.put("profileType", ProfileType.INDIVIDUAL.name());
        payload.put("individualProfile", Map.of(
                "phone", "0900000001",
                "address", "Hà Nội",
                "idNumber", "012345678901",
                "dateOfBirth", "1990-01-01"
        ));

        mockMvc.perform(post("/auth/register-warehouse-manager")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value(UserRole.WAREHOUSE_MANAGER.name()))
                .andExpect(jsonPath("$.email").value(email))
                // Hồ sơ cá nhân không gắn công ty
                .andExpect(jsonPath("$.companyId").doesNotExist())
                .andExpect(jsonPath("$.companyName").doesNotExist());
    }

    @Test
    void registerWarehouseManager_duplicateEmail_returnsConflict() throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("email", email);
        payload.put("password", "12345678");
        payload.put("fullName", "Nguyễn Văn A");
        payload.put("profileType", ProfileType.INDIVIDUAL.name());
        payload.put("individualProfile", Map.of("phone", "0900000002"));

        mockMvc.perform(post("/auth/register-warehouse-manager")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/auth/register-warehouse-manager")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("Email đã được đăng ký"));
    }

    @Test
    void registerWarehouseManager_duplicateCompanyName_returnsConflict() throws Exception {
        String companyName = "Công ty trùng tên " + UUID.randomUUID();
        Map<String, Object> payload = new HashMap<>();
        payload.put("email", email);
        payload.put("password", "12345678");
        payload.put("fullName", "Nguyễn Văn A");
        payload.put("profileType", ProfileType.COMPANY.name());
        payload.put("companyProfile", Map.of(
                "companyName", companyName,
                "businessModel", "TECH"
        ));

        mockMvc.perform(post("/auth/register-warehouse-manager")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isCreated());

        Map<String, Object> secondPayload = new HashMap<>(payload);
        secondPayload.put("email", "manager-" + UUID.randomUUID() + "@wareflow.vn");
        secondPayload.put("companyProfile", Map.of(
                "companyName", companyName,
                "businessModel", "TECH"
        ));

        mockMvc.perform(post("/auth/register-warehouse-manager")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(secondPayload)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Tên công ty đã tồn tại"));
    }

    @Test
    void registerWarehouseManager_duplicateTaxCode_returnsConflict() throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("email", email);
        payload.put("password", "12345678");
        payload.put("fullName", "Nguyễn Văn A");
        payload.put("profileType", ProfileType.COMPANY.name());
        payload.put("companyProfile", Map.of(
                "companyName", "Công ty " + UUID.randomUUID(),
                "businessModel", "TECH",
                "taxCode", taxCode
        ));

        mockMvc.perform(post("/auth/register-warehouse-manager")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isCreated());

        Map<String, Object> secondPayload = new HashMap<>(payload);
        secondPayload.put("email", "manager-" + UUID.randomUUID() + "@wareflow.vn");
        secondPayload.put("companyProfile", Map.of(
                "companyName", "Công ty khác " + UUID.randomUUID(),
                "businessModel", "TECH",
                "taxCode", taxCode
        ));

        mockMvc.perform(post("/auth/register-warehouse-manager")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(secondPayload)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Mã số thuế đã được đăng ký"));
    }

    @Test
    void registerWarehouseManager_userSaveFails_rollsBackCompanyProfile() throws Exception {
        String companyName = "Công ty rollback " + UUID.randomUUID();

        // Ép lỗi khi lưu user -> transaction phải rollback luôn hồ sơ công ty đã tạo.
        doAnswer(invocation -> {
            throw new IllegalStateException("Lỗi lưu user giả lập");
        }).when(spiedUserRepository).save(any(User.class));

        Map<String, Object> payload = new HashMap<>();
        payload.put("email", email);
        payload.put("password", "12345678");
        payload.put("fullName", "Nguyễn Văn A");
        payload.put("profileType", ProfileType.COMPANY.name());
        payload.put("companyProfile", Map.of(
                "companyName", companyName,
                "businessModel", "TECH"
        ));

        mockMvc.perform(post("/auth/register-warehouse-manager")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().is5xxServerError())
                // Không rò rỉ stack trace / thông tin nội bộ
                .andExpect(jsonPath("$.message").value("Đã xảy ra lỗi hệ thống, vui lòng thử lại"))
                .andExpect(jsonPath("$.path").doesNotExist());

        // Hồ sơ công ty phải được rollback -> không còn trong DB
        assertThat(companyRepository.existsByNameIgnoreCase(companyName)).isFalse();
    }

    @Test
    void registerWarehouseManager_missingRequiredFields_returnsBadRequest() throws Exception {
        mockMvc.perform(post("/auth/register-warehouse-manager")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "not-an-email",
                                "password", "123",
                                "fullName", ""
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.errors").isNotEmpty());
    }

    @Test
    void registerWarehouseManager_companyTypeWithoutCompanyProfile_returnsBadRequest() throws Exception {
        mockMvc.perform(post("/auth/register-warehouse-manager")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email,
                                "password", "12345678",
                                "fullName", "Nguyễn Văn A",
                                "profileType", ProfileType.COMPANY.name()
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Hồ sơ công ty không được để trống khi đăng ký loại công ty"));
    }

    @Test
    void registerWarehouseManager_individualTypeWithoutIndividualProfile_returnsBadRequest() throws Exception {
        mockMvc.perform(post("/auth/register-warehouse-manager")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email,
                                "password", "12345678",
                                "fullName", "Nguyễn Văn A",
                                "profileType", ProfileType.INDIVIDUAL.name()
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Hồ sơ cá nhân không được để trống khi đăng ký loại cá nhân"));
    }

    @Test
    void registerWarehouseManager_bothProfiles_returnsBadRequest() throws Exception {
        mockMvc.perform(post("/auth/register-warehouse-manager")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email,
                                "password", "12345678",
                                "fullName", "Nguyễn Văn A",
                                "profileType", ProfileType.COMPANY.name(),
                                "companyProfile", Map.of(
                                        "companyName", "Công ty " + UUID.randomUUID(),
                                        "businessModel", "OTHER"
                                ),
                                "individualProfile", Map.of("phone", "0900000003")
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Không được gửi cả hồ sơ công ty và hồ sơ cá nhân"));
    }

    @Test
    void registerWarehouseManager_invalidRole_returnsBadRequest() throws Exception {
        mockMvc.perform(post("/auth/register-warehouse-manager")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email,
                                "password", "12345678",
                                "fullName", "Nguyễn Văn A",
                                "role", UserRole.SYSTEM_ADMIN.name(),
                                "profileType", ProfileType.INDIVIDUAL.name(),
                                "individualProfile", Map.of("phone", "0900000004")
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Role không hợp lệ, chỉ hỗ trợ tạo tài khoản WAREHOUSE_MANAGER"));
    }

    @Test
    void registerWarehouseManager_invalidBusinessModel_returnsBadRequest() throws Exception {
        mockMvc.perform(post("/auth/register-warehouse-manager")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email,
                                "password", "12345678",
                                "fullName", "Nguyễn Văn A",
                                "profileType", ProfileType.COMPANY.name(),
                                "companyProfile", Map.of(
                                        "companyName", "Công ty " + UUID.randomUUID(),
                                        "businessModel", "NOT_A_MODEL"
                                )
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void registerWarehouseManager_malformedJson_returnsBadRequest() throws Exception {
        mockMvc.perform(post("/auth/register-warehouse-manager")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ this is not json }"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }
}
