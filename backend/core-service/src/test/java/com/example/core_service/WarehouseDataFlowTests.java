package com.example.core_service;

import com.example.core_service.dto.request.*;
import com.example.core_service.entity.*;
import com.example.core_service.entity.enums.*;
import com.example.core_service.exception.ApiException;
import com.example.core_service.repository.*;
import com.example.core_service.security.*;
import com.example.core_service.service.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @Transactional
@ActiveProfiles("workflow-test")
class WarehouseDataFlowTests {
    @Autowired SupplierService suppliers;
    @Autowired SupplierRepository supplierRepository;
    @Autowired CompanyRepository companies;
    @Autowired UserRepository users;
    @Autowired WarehouseRepository warehouses;
    @Autowired WarehouseTransactionRepository transactions;
    @Autowired WarehouseTransactionService warehouseTransactions;
    @Autowired WarehouseFinanceEventRepository events;
    @Autowired JwtTokenProvider tokens;
    @Autowired MockMvc mvc;
    User admin;
    Company company;

    @BeforeEach void setup() {
        company = companies.save(Company.builder().name("Flow " + UUID.randomUUID()).businessModel(CompanyBusinessModel.TECH).status(CompanyStatus.ACTIVE).build());
        admin = users.findFirstByRole(UserRole.SYSTEM_ADMIN).orElseThrow();
        authenticate(admin);
    }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }
    User user(UserRole role, Company tenant) {
        return users.save(User.builder().email(UUID.randomUUID() + "@test.invalid").fullName("Test user")
                .passwordHash("unused").role(role).company(tenant).status(UserStatus.ACTIVE).build());
    }
    void authenticate(User user) {
        var principal = UserPrincipal.builder().id(user.getId()).email(user.getEmail()).role(user.getRole())
                .companyId(user.getCompany() == null ? null : user.getCompany().getId()).build();
        SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.authenticated(principal, null, principal.getAuthorities()));
    }
    UUID supplier(String name) {
        return (UUID) suppliers.save(null, new SupplierRequest(name, CompanyBusinessModel.TECH, "Liên hệ", "0900000000", "supplier@test.invalid", "Hà Nội")).get("id");
    }

    @Test void supplierCatalogPersistsAndManagerCanReadSharedProducts() throws Exception {
        UUID id = supplier("Shared supplier");
        var product = suppliers.saveProduct(id, null, new SupplierProductRequest("SKU-1", "Sản phẩm", "cái", new BigDecimal("12500"), "123", ""));
        supplierRepository.flush();
        User manager = user(UserRole.WAREHOUSE_MANAGER, company);
        mvc.perform(get("/suppliers/{id}/products", id).header("Authorization", "Bearer " + tokens.generateToken(manager)))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(product.get("id")))
                .andExpect(jsonPath("$[0].price").value(12500)).andExpect(jsonPath("$[0].sku").value("SKU-1"));
        authenticate(manager);
        assertTrue(suppliers.list(PageRequest.of(0, 100)).getContent().stream().anyMatch(s -> id.equals(s.get("id"))));
        assertThrows(ApiException.class, () -> suppliers.saveProduct(id, null, new SupplierProductRequest("BAD", "Forbidden", "cái", BigDecimal.ONE, null, null)));
    }

    @Test void privateCatalogCannotLeakAcrossCompaniesAndDuplicateSkuIsRejected() {
        authenticate(user(UserRole.COMPANY_ADMIN, company));
        UUID id = supplier("Private supplier");
        var request = new SupplierProductRequest("SKU-1", "Private product", "cái", BigDecimal.TEN, null, null);
        suppliers.saveProduct(id, null, request);
        assertThrows(ApiException.class, () -> suppliers.saveProduct(id, null, new SupplierProductRequest("sku-1", "Duplicate", "cái", BigDecimal.ONE, null, null)));
        Company other = companies.save(Company.builder().name("Other " + UUID.randomUUID()).build());
        authenticate(user(UserRole.COMPANY_ADMIN, other));
        assertThrows(ApiException.class, () -> suppliers.products(id));
        assertTrue(suppliers.list(PageRequest.of(0, 100)).getContent().stream().noneMatch(s -> id.equals(s.get("id"))));
    }

    @Test void approvalPersistsAgreedAmountAndEventExactlyOnce() {
        Warehouse warehouse = warehouses.save(Warehouse.builder().name("Kho " + UUID.randomUUID()).warehouseType(WarehouseType.RENT)
                .price(new BigDecimal("25000000")).status(WarehouseStatus.AVAILABLE).build());
        WarehouseTransaction proposal = transactions.save(WarehouseTransaction.builder().warehouse(warehouse).company(company)
                .type(WarehouseTransactionType.RENT).offeredPrice(new BigDecimal("23000000")).build());
        var result = warehouseTransactions.approve(proposal.getId());
        assertEquals(WarehouseTransactionStatus.COMPLETED, result.status());
        assertEquals(company.getId(), warehouse.getOwnerCompany().getId());
        var event = events.findById(proposal.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("23000000").compareTo(event.getAmount()));
        assertEquals(proposal.getCompletedAt(), event.getOccurredAt());
        assertNull(event.getDeliveredAt());
        assertThrows(ApiException.class, () -> warehouseTransactions.approve(proposal.getId()));
        assertEquals(1, events.count());
    }

    @Test void userDirectoryCountsAllAccountsWithoutExposingPasswordHashes() throws Exception {
        user(UserRole.WAREHOUSE_MANAGER, company);
        mvc.perform(get("/users").header("Authorization", "Bearer " + tokens.generateToken(admin)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content[0].passwordHash").doesNotExist());
        User manager = user(UserRole.WAREHOUSE_MANAGER, company);
        mvc.perform(get("/users").header("Authorization", "Bearer " + tokens.generateToken(manager))).andExpect(status().isForbidden());
    }
}
