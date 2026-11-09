package com.example.core_service;

import com.example.core_service.dto.response.AuthResponse;
import com.example.core_service.dto.response.WarehouseTransactionResponse;
import com.example.core_service.entity.enums.UserRole;
import com.example.core_service.entity.enums.WarehouseTransactionStatus;
import com.example.core_service.entity.enums.WarehouseTransactionType;
import com.example.core_service.entity.enums.WarehouseType;
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

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration test cho luồng thuê kho (RENT):
 * <ol>
 *   <li>SYSTEM_ADMIN tạo kho loại RENT → trạng thái AVAILABLE</li>
 *   <li>COMPANY_ADMIN gửi đề nghị thuê kho → trạng thái PENDING</li>
 *   <li>Thương lượng giá giữa 2 bên → trạng thái NEGOTIATING</li>
 *   <li>SYSTEM_ADMIN duyệt giao dịch → trạng thái COMPLETED, kho ACTIVE</li>
 *   <li>Từ chối đề nghị thuê kho → trạng thái REJECTED</li>
 *   <li>Validation: đề nghị sai loại kho / kho không khả dụng / kho của chính công ty</li>
 *   <li>Trả kho thuê: COMPANY_ADMIN yêu cầu → SYSTEM_ADMIN duyệt → kho về AVAILABLE</li>
 * </ol>
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class WarehouseRentFlowTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    /** Token của SYSTEM_ADMIN (seed từ DataInitializer) */
    private String systemAdminToken;

    /** Token của COMPANY_ADMIN công ty thuê kho */
    private String companyAdminToken;
    private String companyId;

    /** Token của WAREHOUSE_MANAGER thuộc công ty thuê kho */
    private String managerToken;
    private String managerId;

    @BeforeEach
    void setUp() throws Exception {
        systemAdminToken = login("admin@wareflow.com", "admin123");

        // Đăng ký công ty mới (COMPANY_ADMIN) để thuê kho
        String email = "tenant-" + UUID.randomUUID() + "@wareflow.vn";
        MvcResult companyResult = mockMvc.perform(post("/auth/register-company")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "companyName", "Công ty thuê kho " + UUID.randomUUID(),
                                "businessModel", "FOOD",
                                "email", email,
                                "password", "12345678",
                                "fullName", "Nguyễn Thuê Kho"
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        AuthResponse companyAuth = objectMapper.readValue(
                companyResult.getResponse().getContentAsString(), AuthResponse.class);
        companyAdminToken = companyAuth.accessToken();
        companyId = companyAuth.companyId().toString();

        // Đăng ký WAREHOUSE_MANAGER thuộc công ty này
        String managerEmail = "manager-rent-" + UUID.randomUUID() + "@wareflow.vn";
        MvcResult managerResult = mockMvc.perform(post("/auth/register-warehouse-manager")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", managerEmail,
                                "password", "12345678",
                                "fullName", "Trần Quản Lý Thuê",
                                "profileType", "INDIVIDUAL",
                                "role", UserRole.WAREHOUSE_MANAGER.name(),
                                "individualProfile", Map.of("phone", "0900111222")
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        AuthResponse managerAuth = objectMapper.readValue(
                managerResult.getResponse().getContentAsString(), AuthResponse.class);
        managerToken = managerAuth.accessToken();
        managerId = managerAuth.userId().toString();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. LUỒNG THUÊ KHO THÀNH CÔNG (PENDING → COMPLETED)
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void rentWarehouse_fullFlow_pending_to_completed() throws Exception {
        // Bước 1: SYSTEM_ADMIN tạo kho loại RENT
        String warehouseId = createRentWarehouse("Kho thuê luồng " + UUID.randomUUID());

        // Bước 2: COMPANY_ADMIN gửi đề nghị thuê kho
        MvcResult txResult = mockMvc.perform(post("/warehouse-transactions")
                        .header("Authorization", bearer(companyAdminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "warehouseId", warehouseId,
                                "type", WarehouseTransactionType.RENT.name(),
                                "offeredPrice", 5000000
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value(WarehouseTransactionType.RENT.name()))
                .andExpect(jsonPath("$.status").value(WarehouseTransactionStatus.PENDING.name()))
                .andExpect(jsonPath("$.warehouseId").value(warehouseId))
                .andExpect(jsonPath("$.companyId").value(companyId))
                .andReturn();

        String txId = objectMapper.readValue(
                txResult.getResponse().getContentAsString(), WarehouseTransactionResponse.class).id().toString();
        assertThat(txId).isNotBlank();

        // Bước 3: SYSTEM_ADMIN duyệt giao dịch → COMPLETED, kho ACTIVE
        mockMvc.perform(post("/warehouse-transactions/{id}/approve", txId)
                        .header("Authorization", bearer(systemAdminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(WarehouseTransactionStatus.COMPLETED.name()))
                .andExpect(jsonPath("$.type").value(WarehouseTransactionType.RENT.name()));

        // Xác nhận kho đã ACTIVE
        mockMvc.perform(get("/warehouses/{id}", warehouseId)
                        .header("Authorization", bearer(systemAdminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.ownerCompanyId").value(companyId));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. LUỒNG THUÊ KHO CÓ THƯƠNG LƯỢNG GIÁ
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void rentWarehouse_withNegotiation_thenApprove() throws Exception {
        // Tạo kho RENT
        String warehouseId = createRentWarehouse("Kho thuê thương lượng " + UUID.randomUUID());

        // Gửi đề nghị thuê
        MvcResult txResult = mockMvc.perform(post("/warehouse-transactions")
                        .header("Authorization", bearer(companyAdminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "warehouseId", warehouseId,
                                "type", WarehouseTransactionType.RENT.name(),
                                "offeredPrice", 3000000
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        String txId = objectMapper.readValue(
                txResult.getResponse().getContentAsString(), WarehouseTransactionResponse.class).id().toString();

        // SYSTEM_ADMIN thương lượng lại giá
        mockMvc.perform(post("/warehouse-transactions/{id}/negotiations", txId)
                        .header("Authorization", bearer(systemAdminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "message", "Giá tối thiểu cho kho này là 4.500.000 VNĐ/tháng",
                                "offeredPrice", 4500000
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(WarehouseTransactionStatus.NEGOTIATING.name()));

        // COMPANY_ADMIN đồng ý giá mới
        mockMvc.perform(post("/warehouse-transactions/{id}/negotiations", txId)
                        .header("Authorization", bearer(companyAdminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "message", "Đồng ý với giá 4.500.000 VNĐ/tháng",
                                "offeredPrice", 4500000
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(WarehouseTransactionStatus.NEGOTIATING.name()))
                .andExpect(jsonPath("$.offeredPrice").value(4500000));

        // SYSTEM_ADMIN duyệt sau khi thương lượng xong
        mockMvc.perform(post("/warehouse-transactions/{id}/approve", txId)
                        .header("Authorization", bearer(systemAdminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(WarehouseTransactionStatus.COMPLETED.name()));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. TỪ CHỐI ĐỀ NGHỊ THUÊ KHO
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void rentWarehouse_systemAdmin_rejects_returnsRejected() throws Exception {
        String warehouseId = createRentWarehouse("Kho bị từ chối " + UUID.randomUUID());

        MvcResult txResult = mockMvc.perform(post("/warehouse-transactions")
                        .header("Authorization", bearer(companyAdminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "warehouseId", warehouseId,
                                "type", WarehouseTransactionType.RENT.name(),
                                "offeredPrice", 1000000
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        String txId = objectMapper.readValue(
                txResult.getResponse().getContentAsString(), WarehouseTransactionResponse.class).id().toString();

        // SYSTEM_ADMIN từ chối
        mockMvc.perform(post("/warehouse-transactions/{id}/reject", txId)
                        .header("Authorization", bearer(systemAdminToken))
                        .param("reason", "Giá đề nghị quá thấp"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(WarehouseTransactionStatus.REJECTED.name()));

        // Kho phải trở về AVAILABLE
        mockMvc.perform(get("/warehouses/{id}", warehouseId)
                        .header("Authorization", bearer(systemAdminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("AVAILABLE"));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. LUỒNG TRẢ KHO THUÊ: COMPANY_ADMIN yêu cầu → SYSTEM_ADMIN duyệt → kho AVAILABLE
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void rentWarehouse_returnFlow_warehouseBecomesAvailableAgain() throws Exception {
        // Thiết lập: thuê kho thành công trước
        String warehouseId = createRentWarehouse("Kho sẽ trả " + UUID.randomUUID());

        MvcResult txResult = mockMvc.perform(post("/warehouse-transactions")
                        .header("Authorization", bearer(companyAdminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "warehouseId", warehouseId,
                                "type", WarehouseTransactionType.RENT.name(),
                                "offeredPrice", 6000000
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        String txId = objectMapper.readValue(
                txResult.getResponse().getContentAsString(), WarehouseTransactionResponse.class).id().toString();

        // SYSTEM_ADMIN duyệt → kho ACTIVE
        mockMvc.perform(post("/warehouse-transactions/{id}/approve", txId)
                        .header("Authorization", bearer(systemAdminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(WarehouseTransactionStatus.COMPLETED.name()));

        // COMPANY_ADMIN bàn giao kho cho WAREHOUSE_MANAGER
        mockMvc.perform(post("/warehouse-transactions/{id}/handover", txId)
                        .header("Authorization", bearer(companyAdminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "managerId", managerId,
                                "note", "Bàn giao kho thuê cho quản lý"
                        ))))
                .andExpect(status().isOk());

        // COMPANY_ADMIN yêu cầu trả kho
        MvcResult returnTxResult = mockMvc.perform(
                        post("/warehouse-transactions/warehouses/{warehouseId}/return", warehouseId)
                                .header("Authorization", bearer(companyAdminToken))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(Map.of("reason", "Hết hợp đồng thuê"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value(WarehouseTransactionType.RETURN.name()))
                .andExpect(jsonPath("$.status").value(WarehouseTransactionStatus.PENDING.name()))
                .andReturn();

        String returnTxId = objectMapper.readValue(
                returnTxResult.getResponse().getContentAsString(), WarehouseTransactionResponse.class).id().toString();

        // SYSTEM_ADMIN duyệt trả kho
        mockMvc.perform(post("/warehouse-transactions/{id}/approve-return", returnTxId)
                        .header("Authorization", bearer(systemAdminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(WarehouseTransactionStatus.COMPLETED.name()));

        // Kho RENT phải trở về AVAILABLE (không phải RETURNED)
        mockMvc.perform(get("/warehouses/{id}", warehouseId)
                        .header("Authorization", bearer(systemAdminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("AVAILABLE"))
                .andExpect(jsonPath("$.ownerCompanyId").value(nullValue()));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. VALIDATION: TỪ CHỐI TRẢ KHO
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void rentWarehouse_rejectReturn_warehouseStaysActive() throws Exception {
        // Thuê kho thành công
        String warehouseId = createRentWarehouse("Kho từ chối trả " + UUID.randomUUID());

        MvcResult txResult = mockMvc.perform(post("/warehouse-transactions")
                        .header("Authorization", bearer(companyAdminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "warehouseId", warehouseId,
                                "type", WarehouseTransactionType.RENT.name(),
                                "offeredPrice", 7000000
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        String txId = objectMapper.readValue(
                txResult.getResponse().getContentAsString(), WarehouseTransactionResponse.class).id().toString();

        mockMvc.perform(post("/warehouse-transactions/{id}/approve", txId)
                        .header("Authorization", bearer(systemAdminToken)))
                .andExpect(status().isOk());

        // Yêu cầu trả kho
        MvcResult returnTxResult = mockMvc.perform(
                        post("/warehouse-transactions/warehouses/{warehouseId}/return", warehouseId)
                                .header("Authorization", bearer(companyAdminToken)))
                .andExpect(status().isCreated())
                .andReturn();
        String returnTxId = objectMapper.readValue(
                returnTxResult.getResponse().getContentAsString(), WarehouseTransactionResponse.class).id().toString();

        // SYSTEM_ADMIN từ chối trả kho
        mockMvc.perform(post("/warehouse-transactions/{id}/reject-return", returnTxId)
                        .header("Authorization", bearer(systemAdminToken))
                        .param("reason", "Chưa đủ điều kiện trả"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(WarehouseTransactionStatus.REJECTED.name()));

        // Kho vẫn ở trạng thái ACTIVE
        mockMvc.perform(get("/warehouses/{id}", warehouseId)
                        .header("Authorization", bearer(systemAdminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. VALIDATION: GỬI THUÊ KHO LOẠI BUY → 400
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void rentWarehouse_wrongType_requestBuyOnRentWarehouse_returnsBadRequest() throws Exception {
        // Kho loại RENT
        String warehouseId = createRentWarehouse("Kho RENT test type " + UUID.randomUUID());

        // Gửi đề nghị BUY → phải bị từ chối (loại không khớp)
        mockMvc.perform(post("/warehouse-transactions")
                        .header("Authorization", bearer(companyAdminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "warehouseId", warehouseId,
                                "type", WarehouseTransactionType.BUY.name(),
                                "offeredPrice", 100000000
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. VALIDATION: COMPANY_ADMIN KHÔNG CÓ TOKEN → 401
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void rentWarehouse_noToken_returnsUnauthorized() throws Exception {
        String warehouseId = createRentWarehouse("Kho RENT no-auth " + UUID.randomUUID());

        mockMvc.perform(post("/warehouse-transactions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "warehouseId", warehouseId,
                                "type", WarehouseTransactionType.RENT.name(),
                                "offeredPrice", 5000000
                        ))))
                .andExpect(status().isUnauthorized());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 8. VALIDATION: THƯƠNG LƯỢNG SAU KHI ĐÃ DUYỆT → 409
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void rentWarehouse_negotiateAfterApproval_returnsConflict() throws Exception {
        String warehouseId = createRentWarehouse("Kho negotiate after approve " + UUID.randomUUID());

        MvcResult txResult = mockMvc.perform(post("/warehouse-transactions")
                        .header("Authorization", bearer(companyAdminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "warehouseId", warehouseId,
                                "type", WarehouseTransactionType.RENT.name(),
                                "offeredPrice", 5000000
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        String txId = objectMapper.readValue(
                txResult.getResponse().getContentAsString(), WarehouseTransactionResponse.class).id().toString();

        // Duyệt trước
        mockMvc.perform(post("/warehouse-transactions/{id}/approve", txId)
                        .header("Authorization", bearer(systemAdminToken)))
                .andExpect(status().isOk());

        // Thương lượng sau khi đã duyệt → 409
        mockMvc.perform(post("/warehouse-transactions/{id}/negotiations", txId)
                        .header("Authorization", bearer(companyAdminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "message", "Muốn giảm giá sau khi duyệt",
                                "offeredPrice", 3000000
                        ))))
                .andExpect(status().isConflict());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 9. XEM DANH SÁCH GIAO DỊCH: COMPANY_ADMIN chỉ thấy giao dịch công ty mình
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void listTransactions_companyAdmin_onlySeesOwnTransactions() throws Exception {
        // Tạo kho và gửi đề nghị từ companyAdminToken
        String warehouseId = createRentWarehouse("Kho list test " + UUID.randomUUID());
        mockMvc.perform(post("/warehouse-transactions")
                        .header("Authorization", bearer(companyAdminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "warehouseId", warehouseId,
                                "type", WarehouseTransactionType.RENT.name(),
                                "offeredPrice", 4000000
                        ))))
                .andExpect(status().isCreated());

        // COMPANY_ADMIN xem danh sách → chỉ thấy giao dịch của công ty mình
        mockMvc.perform(get("/warehouse-transactions")
                        .header("Authorization", bearer(companyAdminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[0].companyId").value(companyId));

        // SYSTEM_ADMIN xem tất cả
        mockMvc.perform(get("/warehouse-transactions")
                        .header("Authorization", bearer(systemAdminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * SYSTEM_ADMIN tạo kho loại RENT, trả về warehouseId.
     */
    private String createRentWarehouse(String name) throws Exception {
        MvcResult result = mockMvc.perform(post("/warehouses")
                        .header("Authorization", bearer(systemAdminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", name,
                                "warehouseType", WarehouseType.RENT.name(),
                                "area", new BigDecimal("500.00"),
                                "price", new BigDecimal("5000000"),
                                "region", "Hồ Chí Minh",
                                "address", "123 Nguyễn Văn Linh, Q7, HCM"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.warehouseType").value(WarehouseType.RENT.name()))
                .andExpect(jsonPath("$.status").value("AVAILABLE"))
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString())
                .get("id").asText();
    }

    private String login(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", email, "password", password))))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readValue(result.getResponse().getContentAsString(), AuthResponse.class).accessToken();
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }
}
