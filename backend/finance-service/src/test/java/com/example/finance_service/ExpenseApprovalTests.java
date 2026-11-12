package com.example.finance_service;
import com.example.finance_service.repository.TransactionRepository;
import com.example.finance_service.security.FinanceAccessService;
import com.example.finance_service.security.FinanceAccessService.Identity;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest @AutoConfigureMockMvc
class ExpenseApprovalTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired TransactionRepository transactions;
    @MockitoBean FinanceAccessService access;
    UUID company=UUID.randomUUID(),warehouse=UUID.randomUUID();
    @BeforeEach void setup(){
        var manager=new Identity(UUID.randomUUID(),company,"WAREHOUSE_MANAGER","manager");
        var owner=new Identity(UUID.randomUUID(),company,"COMPANY_ADMIN","owner");
        when(access.authenticate("manager","COMPANY_ADMIN","WAREHOUSE_MANAGER")).thenReturn(manager);
        when(access.authenticate("owner","COMPANY_ADMIN","SYSTEM_ADMIN")).thenReturn(owner);
        when(access.authenticate("manager","COMPANY_ADMIN","SYSTEM_ADMIN")).thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));
        when(access.company(manager,null)).thenReturn(company);when(access.company(owner,company)).thenReturn(company);
    }
    String create() throws Exception {
        var r=mvc.perform(post("/expense-requests").header("Authorization","manager").contentType(MediaType.APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of("warehouseId",warehouse,"category","PURCHASE","amount",1000,"note","Supplies"))))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("PENDING")).andReturn();
        return json.readTree(r.getResponse().getContentAsString()).get("id").asString();
    }
    @Test void pendingExpenseCannotBeSelfApprovedAndApprovalIsIdempotent() throws Exception {
        String id=create();assertEquals(0,transactions.findAll().stream().filter(t->company.equals(t.getCompanyId())).count());
        mvc.perform(post("/expense-requests/"+id+"/approve").header("Authorization","manager")).andExpect(status().isForbidden());
        mvc.perform(post("/expense-requests/"+id+"/approve").header("Authorization","owner")).andExpect(status().isOk()).andExpect(jsonPath("$.transactionId").isNumber());
        mvc.perform(post("/expense-requests/"+id+"/approve").header("Authorization","owner")).andExpect(status().isOk());
        assertEquals(1,transactions.findAll().stream().filter(t->company.equals(t.getCompanyId())).count());
    }
    @Test void rejectedExpenseNeverCreatesTransaction() throws Exception {
        String id=create();
        mvc.perform(post("/expense-requests/"+id+"/reject").header("Authorization","owner")).andExpect(status().isOk());
        mvc.perform(post("/expense-requests/"+id+"/approve").header("Authorization","owner")).andExpect(status().isConflict());
        assertEquals(0,transactions.findAll().stream().filter(t->company.equals(t.getCompanyId())).count());
    }
}
