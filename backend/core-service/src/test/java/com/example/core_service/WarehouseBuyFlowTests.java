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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration test cho luồng mua kho (BUY):
 * <ol>
 *   <li>SYSTEM_ADMIN tạo kho loại BUY → trạng thái AVAILABLE</li>
 *   <li>COMPANY_ADMIN gửi đề nghị mua kho → trạng thái PENDING</li>
 *   <li>SYSTEM_ADMIN duyệt giao dịch → trạng thái COMPLETED, kho ACTIVE</li>
 *   <li>COMPANY_ADMIN bàn giao kho cho WAREHOUSE_MANAGER</li>
 *   <li>Trả kho mua: COMPANY_ADMIN yêu cầu → SYSTEM_ADMIN duyệt → kho RETURNED</li>
 *   <li>Validation: đề nghị sai loại kho / kho không khả dụng / SYSTEM_ADMIN không được gửi đề nghị</li>
 * </ol>
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class WarehouseBuyFlowTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    /** Token của SYSTEM_ADMIN (seed từ DataInitializer) */
    private String systemAdminToken;

    /** Token của COMPANY_ADMIN công ty mua kho */
    private String companyAdminToken;
    private String companyId;

    /** Token và ID của WAREHOUSE_MANAGER thuộc công ty mua kho */
    private String managerToken;
    private String managerId;

    @BeforeEach
    void setUp() throws Exception {
        systemAdminToken = login("admin@wareflow.com", "admin123");

        // Đăng ký công ty mới (COMPANY_ADMIN) để mua kho
        String email = "buyer-" + UUID.randomUUID() + "@wareflow.vn";
        MvcResult companyResult = mockMvc.perform(post("/auth/register-company")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "companyName", "Công ty mua kho " + UUID.randomUUID(),
                                "businessModel", "TECH",
                                "email", email,
                                "password", "12345678",
                                "fullName", "Nguyễn Mua Kho"
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        AuthResponse companyAuth = objectMapper.readValue(
                companyResult.getResponse().getContentAsString(), AuthResponse.class);
        companyAdminToken = companyAuth.accessToken();
        companyId = companyAuth.companyId().toString();

        // Đăng ký WAREHOUSE_MANAGER thuộc công ty này
        String managerEmail = "manager-buy-" + UUID.randomUUID() + "@wareflow.vn";
        MvcResult managerResult = mockMvc.perform(post("/auth/register-warehouse-manager")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", managerEmail,
                                "password", "12345678",
                                "fullName", "Trần Quản Lý Mua",
                                "profileType", "INDIVIDUAL",
                                "role", UserRole.WAREHOUSE_MANAGER.name(),
                                "individualProfile", Map.of("phone", "0900333444")
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        AuthResponse managerAuth = objectMapper.readValue(
                managerResult.getResponse().getContentAsString(), AuthResponse.class);
        managerToken = managerAuth.accessToken();
        managerId = managerAuth.userId().toString();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. LUỒNG MUA KHO THÀNH CÔNG (PENDING → COMPLETED)
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void buyWarehouse_fullFlow_pending_to_completed() throws Exception {
        // Bước 1: SYSTEM_ADMIN tạo kho loại BUY
        String warehouseId = createBuyWarehouse("Kho mua luồng " + UUID.randomUUID());

        // Bước 2: COMPANY_ADMIN gửi đề nghị mua kho
        MvcResult txResult = mockMvc.perform(post("/warehouse-transactions")
                        .header("Authorization", bearer(companyAdminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "warehouseId", warehouseId,
                                "type", WarehouseTransactionType.BUY.name(),
                                "offeredPrice", 500000000
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value(WarehouseTransactionType.BUY.name()))
                .andExpect(jsonPath("$.status").value(WarehouseTransactionStatus.PENDING.name()))
                .andExpect(jsonPath("$.warehouseId").value(warehouseId))
                .andExpect(jsonPath("$.companyId").value(companyId))
                .andReturn();

        String txId = objectMapper.readValue(
                txResult.getResponse().getContentAsString(), WarehouseTransactionResponse.class).id().toString();

        // Bước 3: SYSTEM_ADMIN duyệt giao dịch → COMPLETED, kho ACTIVE
        mockMvc.perform(post("/warehouse-transactions/{id}/approve", txId)
                        .header("Authorization", bearer(systemAdminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(WarehouseTransactionStatus.COMPLETED.name()))
                .andExpect(jsonPath("$.type").value(WarehouseTransactionType.BUY.name()));

        // Xác nhận kho đã ACTIVE và thuộc về công ty mua
        mockMvc.perform(get("/warehouses/{id}", warehouseId)
                        .header("Authorization", bearer(systemAdminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.ownerCompanyId").value(companyId));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. LUỒNG MUA KHO + BÀN GIAO CHO WAREHOUSE_MANAGER
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void buyWarehouse_thenHandover_toWarehouseManager() throws Exception {
        // Mua kho thành công
        String warehouseId = createBuyWarehouse("Kho mua bàn giao " + UUID.randomUUID());

        MvcResult txResult = mockMvc.perform(post("/warehouse-transactions")
                        .header("Authorization", bearer(companyAdminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "warehouseId", warehouseId,
                                "type", WarehouseTransactionType.BUY.name(),
                                "offeredPrice", 600000000
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        String txId = objectMapper.readValue(
                txResult.getResponse().getContentAsString(), WarehouseTransactionResponse.class).id().toString();

        // Duyệt giao dịch
        mockMvc.perform(post("/warehouse-transactions/{id}/approve", txId)
                        .header("Authorization", bearer(systemAdminToken)))
                .andExpect(status().isOk());

        // COMPANY_ADMIN bàn giao kho cho WAREHOUSE_MANAGER
        mockMvc.perform(post("/warehouse-transactions/{id}/handover", txId)
                        .header("Authorization", bearer(companyAdminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "managerId", managerId,
                                "note", "Bàn giao kho sau khi mua thành công"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(WarehouseTransactionStatus.COMPLETED.name()));

        // Xác nhận kho có handover info
        mockMvc.perform(get("/warehouses/{id}", warehouseId)
                        .header("Authorization", bearer(systemAdminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.handover.managerId").value(managerId));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. LUỒNG MUA KHO CÓ THƯƠNG LƯỢNG GIÁ
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void buyWarehouse_withNegotiation_thenApprove() throws Exception {
        String warehouseId = createBuyWarehouse("Kho mua thương lượng " + UUID.randomUUID());

        // Gửi đề nghị mua
        MvcResult txResult = mockMvc.perform(post("/warehouse-transactions")
                        .header("Authorization", bearer(companyAdminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "warehouseId", warehouseId,
                                "type", WarehouseTransactionType.BUY.name(),
                                "offeredPrice", 400000000
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        String txId = objectMapper.readValue(
                txResult.getResponse().getContentAsString(), WarehouseTransactionResponse.class).id().toString();

        // SYSTEM_ADMIN thương lượng
        mockMvc.perform(post("/warehouse-transactions/{id}/negotiations", txId)
                        .header("Authorization", bearer(systemAdminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "message", "Giá tối thiểu cho kho này là 480.000.000 VNĐ",
                                "offeredPrice", 480000000
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(WarehouseTransactionStatus.NEGOTIATING.name()));

        // COMPANY_ADMIN chấp nhận
        mockMvc.perform(post("/warehouse-transactions/{id}/negotiations", txId)
                        .header("Authorization", bearer(companyAdminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "message", "Đồng ý với giá 480.000.000 VNĐ",
                                "offeredPrice", 480000000
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.offeredPrice").value(480000000));

        // SYSTEM_ADMIN duyệt sau thương lượng
        mockMvc.perform(post("/warehouse-transactions/{id}/approve", txId)
                        .header("Authorization", bearer(systemAdminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(WarehouseTransactionStatus.COMPLETED.name()));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. TỪ CHỐI ĐỀ NGHỊ MUA KHO
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void buyWarehouse_systemAdmin_rejects_returnsRejected() throws Exception {
        String warehouseId = createBuyWarehouse("Kho mua bị từ chối " + UUID.randomUUID());

        MvcResult txResult = mockMvc.perform(post("/warehouse-transactions")
                        .header("Authorization", bearer(companyAdminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "warehouseId", warehouseId,
                                "type", WarehouseTransactionType.BUY.name(),
                                "offeredPrice", 100000000
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        String txId = objectMapper.readValue(
                txResult.getResponse().getContentAsString(), WarehouseTransactionResponse.class).id().toString();

        // SYSTEM_ADMIN từ chối
        mockMvc.perform(post("/warehouse-transactions/{id}/reject", txId)
                        .header("Authorization", bearer(systemAdminToken))
                        .param("reason", "Giá đề nghị quá thấp so với định giá"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(WarehouseTransactionStatus.REJECTED.name()));

        // Kho phải trở về AVAILABLE
        mockMvc.perform(get("/warehouses/{id}", warehouseId)
                        .header("Authorization", bearer(systemAdminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("AVAILABLE"));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. LUỒNG TRẢ KHO MUA: kho mua → RETURNED (không tái sử dụng)
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void buyWarehouse_returnFlow_warehouseBecomesReturned() throws Exception {
        // Mua kho thành công
        String warehouseId = createBuyWarehouse("Kho mua sẽ trả " + UUID.randomUUID());

        MvcResult txResult = mockMvc.perform(post("/warehouse-transactions")
                        .header("Authorization", bearer(companyAdminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "warehouseId", warehouseId,
                                "type", WarehouseTransactionType.BUY.name(),
                                "offeredPrice", 550000000
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        String txId = objectMapper.readValue(
                txResult.getResponse().getContentAsString(), WarehouseTransactionResponse.class).id().toString();

        // Duyệt → kho ACTIVE
        mockMvc.perform(post("/warehouse-transactions/{id}/approve", txId)
                        .header("Authorization", bearer(systemAdminToken)))
                .andExpect(status().isOk());

        // Bàn giao
        mockMvc.perform(post("/warehouse-transactions/{id}/handover", txId)
                        .header("Authorization", bearer(companyAdminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "managerId", managerId,
                                "note", "Bàn giao trước khi trả"
                        ))))
                .andExpect(status().isOk());

        // COMPANY_ADMIN yêu cầu trả kho
        MvcResult returnTxResult = mockMvc.perform(
                        post("/warehouse-transactions/warehouses/{warehouseId}/return", warehouseId)
                                .header("Authorization", bearer(companyAdminToken))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(Map.of("reason", "Không còn nhu cầu sử dụng"))))
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

        // Kho BUY phải chuyển sang RETURNED (không phải AVAILABLE)
        mockMvc.perform(get("/warehouses/{id}", warehouseId)
                        .header("Authorization", bearer(systemAdminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RETURNED"))
                .andExpect(jsonPath("$.ownerCompanyId").value(org.hamcrest.Matchers.nullValue()));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. VALIDATION: GỬI MUA KHO LOẠI RENT → 400
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void buyWarehouse_wrongType_requestRentOnBuyWarehouse_returnsBadRequest() throws Exception {
        // Kho loại BUY
        String warehouseId = createBuyWarehouse("Kho BUY test type " + UUID.randomUUID());

        // Gửi đề nghị RENT → phải bị từ chối (loại không khớp)
        mockMvc.perform(post("/warehouse-transactions")
                        .header("Authorization", bearer(companyAdminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "warehouseId", warehouseId,
                                "type", WarehouseTransactionType.RENT.name(),
                                "offeredPrice", 5000000
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. VALIDATION: SYSTEM_ADMIN KHÔNG ĐƯỢC GỬI ĐỀ NGHỊ MUA KHO → 400
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void buyWarehouse_systemAdmin_cannotRequestBuy_returnsBadRequest() throws Exception {
        String warehouseId = createBuyWarehouse("Kho SYSTEM_ADMIN test " + UUID.randomUUID());

        mockMvc.perform(post("/warehouse-transactions")
                        .header("Authorization", bearer(systemAdminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "warehouseId", warehouseId,
                                "type", WarehouseTransactionType.BUY.name(),
                                "offeredPrice", 500000000
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Quản trị viên hệ thống không thể gửi đề nghị mua/thuê"));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 8. VALIDATION: MUA KHO KHÔNG TỒN TẠI → 404
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void buyWarehouse_nonExistentWarehouse_returnsNotFound() throws Exception {
        String fakeWarehouseId = UUID.randomUUID().toString();

        mockMvc.perform(post("/warehouse-transactions")
                        .header("Authorization", bearer(companyAdminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "warehouseId", fakeWarehouseId,
                                "type", WarehouseTransactionType.BUY.name(),
                                "offeredPrice", 500000000
                        ))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Không tìm thấy kho"));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 9. VALIDATION: BÀN GIAO KHO TRƯỚC KHI DUYỆT → 409
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void buyWarehouse_handoverBeforeApproval_returnsConflict() throws Exception {
        String warehouseId = createBuyWarehouse("Kho handover before approve " + UUID.randomUUID());

        MvcResult txResult = mockMvc.perform(post("/warehouse-transactions")
                        .header("Authorization", bearer(companyAdminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "warehouseId", warehouseId,
                                "type", WarehouseTransactionType.BUY.name(),
                                "offeredPrice", 500000000
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        String txId = objectMapper.readValue(
                txResult.getResponse().getContentAsString(), WarehouseTransactionResponse.class).id().toString();

        // Bàn giao ngay khi giao dịch còn PENDING → 409
        mockMvc.perform(post("/warehouse-transactions/{id}/handover", txId)
                        .header("Authorization", bearer(companyAdminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "managerId", managerId
                        ))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 10. VALIDATION: PAYLOAD THIẾU warehouseId → 400
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void buyWarehouse_missingWarehouseId_returnsBadRequest() throws Exception {
        mockMvc.perform(post("/warehouse-transactions")
                        .header("Authorization", bearer(companyAdminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "type", WarehouseTransactionType.BUY.name(),
                                "offeredPrice", 500000000
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 11. LỌC DANH SÁCH GIAO DỊCH THEO STATUS
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void listTransactions_filterByStatus_returnOnlyMatchingTransactions() throws Exception {
        String warehouseId = createBuyWarehouse("Kho filter status " + UUID.randomUUID());

        // Tạo giao dịch PENDING
        mockMvc.perform(post("/warehouse-transactions")
                        .header("Authorization", bearer(companyAdminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "warehouseId", warehouseId,
                                "type", WarehouseTransactionType.BUY.name(),
                                "offeredPrice", 500000000
                        ))))
                .andExpect(status().isCreated());

        // SYSTEM_ADMIN lọc danh sách theo status=PENDING
        mockMvc.perform(get("/warehouse-transactions")
                        .header("Authorization", bearer(systemAdminToken))
                        .param("status", WarehouseTransactionStatus.PENDING.name()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[?(@.status != 'PENDING')]").doesNotExist());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * SYSTEM_ADMIN tạo kho loại BUY, trả về warehouseId.
     */
    private String createBuyWarehouse(String name) throws Exception {
        MvcResult result = mockMvc.perform(post("/warehouses")
                        .header("Authorization", bearer(systemAdminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", name,
                                "warehouseType", WarehouseType.BUY.name(),
                                "area", new BigDecimal("1000.00"),
                                "price", new BigDecimal("500000000"),
                                "region", "Hà Nội",
                                "address", "456 Giải Phóng, Hoàng Mai, HN"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.warehouseType").value(WarehouseType.BUY.name()))
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
