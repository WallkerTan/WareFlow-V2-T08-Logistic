package com.example.inventory_service;

import com.example.inventory_service.dto.StockDocumentResponse;
import com.example.inventory_service.entity.Product;
import com.example.inventory_service.entity.enums.StockDocumentStatus;
import com.example.inventory_service.entity.enums.StockLotStatus;
import com.example.inventory_service.repository.ProductRepository;
import com.example.inventory_service.security.WarehouseAccessService;
import com.example.inventory_service.security.WarehouseAccessService.UserIdentity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration test cho luồng nhập hàng vào kho đã mua (BUY):
 * <ol>
 *   <li>WAREHOUSE_MANAGER tạo đơn đặt hàng (PO) → trạng thái DRAFT</li>
 *   <li>Gửi duyệt PO (chi tiêu nhỏ) → APPROVED trực tiếp</li>
 *   <li>Gửi duyệt PO (chi tiêu lớn) → PENDING_APPROVAL, bắt buộc COMPANY_ADMIN duyệt</li>
 *   <li>COMPANY_ADMIN phê duyệt PO → APPROVED</li>
 *   <li>WAREHOUSE_MANAGER nhận hàng (RECEIPT) → tạo stock lots</li>
 *   <li>Hủy PO chưa phát sinh receipt</li>
 *   <li>Validation: nhận hàng khi PO chưa được duyệt → 409</li>
 * </ol>
 *
 * <p><b>Lưu ý:</b> {@link WarehouseAccessService} được mock để tránh phụ thuộc
 * mạng vào core-service trong môi trường test đơn vị. Tất cả JWT/ownership
 * verification đều được bypass qua {@code UserIdentity} cứng.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class StockInboundFlowTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ProductRepository productRepository;

    /**
     * Mock WarehouseAccessService để bypass gọi core-service qua mạng.
     * Các test kiểm tra logic nghiệp vụ, không kiểm tra JWT/network layer.
     */
    @MockitoBean
    private WarehouseAccessService warehouseAccessService;

    private UUID warehouseId;
    private UUID managerId;
    private UUID companyAdminId;
    private UUID companyId;
    private UUID productId;

    private static final String FAKE_MANAGER_TOKEN = "Bearer fake-manager-token";
    private static final String FAKE_ADMIN_TOKEN = "Bearer fake-admin-token";

    @BeforeEach
    void setUp() {
        warehouseId = UUID.randomUUID();
        managerId = UUID.randomUUID();
        companyAdminId = UUID.randomUUID();
        companyId = UUID.randomUUID();

        // Tạo UserIdentity cho WAREHOUSE_MANAGER
        UserIdentity managerIdentity = new UserIdentity(managerId, companyId, "WAREHOUSE_MANAGER");
        // Tạo UserIdentity cho COMPANY_ADMIN
        UserIdentity adminIdentity = new UserIdentity(companyAdminId, companyId, "COMPANY_ADMIN");

        // Stub: bất kỳ token nào bắt đầu bằng "fake-manager" → WAREHOUSE_MANAGER
        when(warehouseAccessService.authorizeRoles(
                eq(FAKE_MANAGER_TOKEN), any(UUID.class),
                eq("WAREHOUSE_MANAGER"), eq("COMPANY_ADMIN")))
                .thenReturn(managerIdentity);

        // Stub: bất kỳ token nào bắt đầu bằng "fake-admin" → COMPANY_ADMIN
        when(warehouseAccessService.authorizeRoles(
                eq(FAKE_ADMIN_TOKEN), any(UUID.class),
                eq("COMPANY_ADMIN"), eq("SYSTEM_ADMIN")))
                .thenReturn(adminIdentity);

        // Stub: authorize read (false) → trả về adminIdentity
        when(warehouseAccessService.authorize(any(), any(UUID.class), eq(false)))
                .thenReturn(adminIdentity);

        // Stub: authorize write (true) → trả về managerIdentity
        when(warehouseAccessService.authorize(any(), any(UUID.class), eq(true)))
                .thenReturn(managerIdentity);

        // Tạo sản phẩm trong kho (thêm trực tiếp vào DB)
        String sku = "SKU-TEST-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Product product = Product.builder()
                .warehouseId(warehouseId)
                .sku(sku)
                .name("Sản phẩm test nhập hàng")
                .unit("Thùng")
                .minStock(new BigDecimal("10"))
                .build();
        product = productRepository.save(product);
        productId = product.getId();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. TẠO PO → DRAFT
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void createPurchaseOrder_asDraft_success() throws Exception {
        mockMvc.perform(post("/warehouses/{warehouseId}/purchase-orders", warehouseId)
                        .header("Authorization", FAKE_MANAGER_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(buildPoJson(productId, new BigDecimal("100"), new BigDecimal("50000"), false)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("PO"))
                .andExpect(jsonPath("$.status").value(StockDocumentStatus.DRAFT.name()))
                .andExpect(jsonPath("$.warehouseId").value(warehouseId.toString()))
                .andExpect(jsonPath("$.lines").isArray())
                .andExpect(jsonPath("$.lines[0].productId").value(productId.toString()))
                .andExpect(jsonPath("$.lines[0].qty").value(100));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. TẠO PO → GỬI DUYỆT → APPROVED (chi tiêu nhỏ, do COMPANY_ADMIN tạo)
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void createPurchaseOrder_submitImmediately_smallSpending_approved() throws Exception {
        // COMPANY_ADMIN tạo và submit ngay (chi tiêu nhỏ: 100 × 50.000 = 5.000.000 < 20.000.000)
        // Với submitImmediately=true và COMPANY_ADMIN, PO nhỏ → APPROVED thẳng
        UserIdentity adminIdentity = new UserIdentity(companyAdminId, companyId, "COMPANY_ADMIN");
        when(warehouseAccessService.authorizeRoles(
                eq(FAKE_ADMIN_TOKEN), any(UUID.class),
                eq("WAREHOUSE_MANAGER"), eq("COMPANY_ADMIN")))
                .thenReturn(adminIdentity);

        mockMvc.perform(post("/warehouses/{warehouseId}/purchase-orders", warehouseId)
                        .header("Authorization", FAKE_ADMIN_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(buildPoJson(productId, new BigDecimal("100"), new BigDecimal("50000"), true)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value(StockDocumentStatus.APPROVED.name()));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. TẠO PO → GỬI DUYỆT → PENDING_APPROVAL (chi tiêu lớn)
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void createPurchaseOrder_submitImmediately_largeSpending_pendingApproval() throws Exception {
        // Chi tiêu lớn: 1000 × 25.000 = 25.000.000 >= 20.000.000
        // WAREHOUSE_MANAGER submit → phải qua PENDING_APPROVAL
        mockMvc.perform(post("/warehouses/{warehouseId}/purchase-orders", warehouseId)
                        .header("Authorization", FAKE_MANAGER_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(buildPoJson(productId, new BigDecimal("1000"), new BigDecimal("25000"), true)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value(StockDocumentStatus.PENDING_APPROVAL.name()))
                .andExpect(jsonPath("$.approval.isLargeSpending").value(true));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. LUỒNG ĐẦY ĐỦ: DRAFT → PENDING_APPROVAL → APPROVED → RECEIPT
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void stockInboundFlow_draft_to_receipt_fullFlow() throws Exception {
        // Bước 1: WAREHOUSE_MANAGER tạo PO (chi tiêu lớn)
        MvcResult createResult = mockMvc.perform(post("/warehouses/{warehouseId}/purchase-orders", warehouseId)
                        .header("Authorization", FAKE_MANAGER_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(buildPoJson(productId, new BigDecimal("1000"), new BigDecimal("25000"), false)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value(StockDocumentStatus.DRAFT.name()))
                .andReturn();

        String poId = objectMapper.readValue(
                createResult.getResponse().getContentAsString(), StockDocumentResponse.class).id().toString();

        // Bước 2: WAREHOUSE_MANAGER gửi duyệt → PENDING_APPROVAL (chi tiêu lớn)
        mockMvc.perform(post("/warehouses/{warehouseId}/purchase-orders/{poId}/submit", warehouseId, poId)
                        .header("Authorization", FAKE_MANAGER_TOKEN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(StockDocumentStatus.PENDING_APPROVAL.name()));

        // Bước 3: COMPANY_ADMIN phê duyệt PO
        mockMvc.perform(post("/warehouses/{warehouseId}/purchase-orders/{poId}/approve", warehouseId, poId)
                        .header("Authorization", FAKE_ADMIN_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("note", "Duyệt chi tiêu lớn cho kho mới"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(StockDocumentStatus.APPROVED.name()))
                .andExpect(jsonPath("$.approval.approvalStatus").value("APPROVED"));

        // Bước 4: WAREHOUSE_MANAGER nhận hàng (RECEIPT đối chiếu với PO)
        String lotCode = "LOT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String receiptBody = objectMapper.writeValueAsString(Map.of(
                "poId", poId,
                "note", "Nhận hàng lô đầu tiên",
                "completePo", true,
                "lines", List.of(Map.of(
                        "productId", productId.toString(),
                        "receivedQty", 1000,
                        "lotCode", lotCode,
                        "expiryDate", LocalDate.now().plusMonths(6).toString(),
                        "condition", StockLotStatus.NORMAL.name()
                ))
        ));

        MvcResult receiptResult = mockMvc.perform(post("/warehouses/{warehouseId}/receipts", warehouseId)
                        .header("Authorization", FAKE_MANAGER_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(receiptBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("RECEIPT"))
                .andExpect(jsonPath("$.status").value(StockDocumentStatus.DONE.name()))
                .andExpect(jsonPath("$.lines").isArray())
                .andReturn();

        // Xác nhận receipt có lines hợp lệ
        StockDocumentResponse receipt = objectMapper.readValue(
                receiptResult.getResponse().getContentAsString(), StockDocumentResponse.class);
        assertThat(receipt.lines()).isNotEmpty();
        assertThat(receipt.warehouseId()).isEqualTo(warehouseId);

        // Bước 5: Xem danh sách receipts của PO
        mockMvc.perform(get("/warehouses/{warehouseId}/purchase-orders/{poId}/receipts", warehouseId, poId)
                        .header("Authorization", FAKE_ADMIN_TOKEN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].type").value("RECEIPT"));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. TẠO PO → HỦY → CANCELLED
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void cancelPurchaseOrder_draft_success() throws Exception {
        // Tạo PO DRAFT
        MvcResult createResult = mockMvc.perform(post("/warehouses/{warehouseId}/purchase-orders", warehouseId)
                        .header("Authorization", FAKE_MANAGER_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(buildPoJson(productId, new BigDecimal("50"), new BigDecimal("100000"), false)))
                .andExpect(status().isCreated())
                .andReturn();

        String poId = objectMapper.readValue(
                createResult.getResponse().getContentAsString(), StockDocumentResponse.class).id().toString();

        // Hủy PO
        // Stub thêm cancel endpoint role
        UserIdentity managerIdentity = new UserIdentity(managerId, companyId, "WAREHOUSE_MANAGER");
        when(warehouseAccessService.authorizeRoles(
                eq(FAKE_MANAGER_TOKEN), any(UUID.class),
                eq("WAREHOUSE_MANAGER"), eq("COMPANY_ADMIN")))
                .thenReturn(managerIdentity);

        mockMvc.perform(post("/warehouses/{warehouseId}/purchase-orders/{poId}/cancel", warehouseId, poId)
                        .header("Authorization", FAKE_MANAGER_TOKEN)
                        .param("reason", "Thay đổi kế hoạch nhập hàng"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(StockDocumentStatus.CANCELLED.name()));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. VALIDATION: TỪ CHỐI PO (PENDING_APPROVAL → CANCELLED)
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void rejectPurchaseOrder_pendingApproval_becomeCancelled() throws Exception {
        // Tạo PO chi tiêu lớn → PENDING_APPROVAL
        MvcResult createResult = mockMvc.perform(post("/warehouses/{warehouseId}/purchase-orders", warehouseId)
                        .header("Authorization", FAKE_MANAGER_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(buildPoJson(productId, new BigDecimal("1000"), new BigDecimal("25000"), true)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value(StockDocumentStatus.PENDING_APPROVAL.name()))
                .andReturn();

        String poId = objectMapper.readValue(
                createResult.getResponse().getContentAsString(), StockDocumentResponse.class).id().toString();

        // COMPANY_ADMIN từ chối
        mockMvc.perform(post("/warehouses/{warehouseId}/purchase-orders/{poId}/reject", warehouseId, poId)
                        .header("Authorization", FAKE_ADMIN_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("note", "Vượt ngân sách quý"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(StockDocumentStatus.CANCELLED.name()))
                .andExpect(jsonPath("$.approval.approvalStatus").value("REJECTED"))
                .andExpect(jsonPath("$.approval.rejectionReason").value("Vượt ngân sách quý"));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. VALIDATION: NHẬN HÀNG KHI PO CHƯA APPROVED → 409
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void createReceipt_whenPoNotApproved_returnsConflict() throws Exception {
        // PO vẫn còn DRAFT
        MvcResult createResult = mockMvc.perform(post("/warehouses/{warehouseId}/purchase-orders", warehouseId)
                        .header("Authorization", FAKE_MANAGER_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(buildPoJson(productId, new BigDecimal("100"), new BigDecimal("50000"), false)))
                .andExpect(status().isCreated())
                .andReturn();

        String poId = objectMapper.readValue(
                createResult.getResponse().getContentAsString(), StockDocumentResponse.class).id().toString();

        // Thử nhận hàng khi PO chưa APPROVED
        String receiptBody = objectMapper.writeValueAsString(Map.of(
                "poId", poId,
                "lines", List.of(Map.of(
                        "productId", productId.toString(),
                        "receivedQty", 50,
                        "lotCode", "LOT-EARLY"
                ))
        ));

        mockMvc.perform(post("/warehouses/{warehouseId}/receipts", warehouseId)
                        .header("Authorization", FAKE_MANAGER_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(receiptBody))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 8. VALIDATION: TẠO PO KHÔNG CÓ LINES → 400
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void createPurchaseOrder_emptyLines_returnsBadRequest() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "supplierName", "Nhà cung cấp A",
                "lines", List.of()
        ));

        mockMvc.perform(post("/warehouses/{warehouseId}/purchase-orders", warehouseId)
                        .header("Authorization", FAKE_MANAGER_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 9. VALIDATION: NHẬN HÀNG VỚI SẢN PHẨM KHÔNG TỒN TẠI TRONG KHO → 404
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void createPurchaseOrder_productNotInWarehouse_returnsNotFound() throws Exception {
        UUID nonExistentProductId = UUID.randomUUID();

        String body = objectMapper.writeValueAsString(Map.of(
                "supplierName", "Nhà cung cấp B",
                "lines", List.of(Map.of(
                        "productId", nonExistentProductId.toString(),
                        "qty", 100,
                        "price", 50000
                ))
        ));

        mockMvc.perform(post("/warehouses/{warehouseId}/purchase-orders", warehouseId)
                        .header("Authorization", FAKE_MANAGER_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 10. XEM DANH SÁCH & CHI TIẾT PO
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void listAndGetPurchaseOrder_success() throws Exception {
        // Tạo PO
        MvcResult createResult = mockMvc.perform(post("/warehouses/{warehouseId}/purchase-orders", warehouseId)
                        .header("Authorization", FAKE_MANAGER_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(buildPoJson(productId, new BigDecimal("20"), new BigDecimal("100000"), false)))
                .andExpect(status().isCreated())
                .andReturn();

        String poId = objectMapper.readValue(
                createResult.getResponse().getContentAsString(), StockDocumentResponse.class).id().toString();

        // Xem danh sách PO của kho
        // Stub list endpoint (authorizeRoles với 3 role)
        UserIdentity adminIdentity = new UserIdentity(companyAdminId, companyId, "COMPANY_ADMIN");
        when(warehouseAccessService.authorizeRoles(
                eq(FAKE_ADMIN_TOKEN), any(UUID.class),
                eq("WAREHOUSE_MANAGER"), eq("COMPANY_ADMIN"), eq("SYSTEM_ADMIN")))
                .thenReturn(adminIdentity);

        mockMvc.perform(get("/warehouses/{warehouseId}/purchase-orders", warehouseId)
                        .header("Authorization", FAKE_ADMIN_TOKEN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());

        // Xem chi tiết PO
        mockMvc.perform(get("/warehouses/{warehouseId}/purchase-orders/{poId}", warehouseId, poId)
                        .header("Authorization", FAKE_ADMIN_TOKEN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(poId))
                .andExpect(jsonPath("$.type").value("PO"))
                .andExpect(jsonPath("$.status").value(StockDocumentStatus.DRAFT.name()));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Xây dựng JSON body cho createPurchaseOrder.
     *
     * @param productId         ID sản phẩm
     * @param qty               Số lượng đặt
     * @param price             Đơn giá
     * @param submitImmediately Gửi duyệt ngay?
     */
    private String buildPoJson(UUID productId, BigDecimal qty, BigDecimal price,
                               boolean submitImmediately) throws Exception {
        return objectMapper.writeValueAsString(Map.of(
                "supplierName", "Nhà cung cấp Test",
                "note", "Đơn đặt hàng test tự động",
                "submitImmediately", submitImmediately,
                "lines", List.of(Map.of(
                        "productId", productId.toString(),
                        "qty", qty,
                        "price", price,
                        "note", "Line test"
                ))
        ));
    }
}
