package com.example.finance_service;

import com.example.finance_service.controller.*;
import com.example.finance_service.dto.*;
import com.example.finance_service.service.*;
import com.example.finance_service.security.FinanceAccessService;
import com.example.finance_service.service.FinancePeriods.GroupBy;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.*;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClient;
import org.springframework.http.MediaType;
import java.time.*;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.anything;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;
import org.springframework.web.server.ResponseStatusException;

class FinanceReportHttpTests {
    static final String SECRET="Y3Vyb3VyZS1uZWVkcy1hLXNlY3JldC1rZXktbWluaW11bS0zMi1ieXRlcy1sb25nISE=";
    final UUID company=UUID.randomUUID(), user=UUID.randomUUID(), warehouse=UUID.randomUUID();
    FinanceAccessService access;
    FinanceReportService reports;
    FinanceService finance;
    MockRestServiceServer core;
    MockMvc mvc;
    boolean accountActive=true;
    @BeforeEach void setup() {
        var builder=RestClient.builder().baseUrl("http://core");
        builder.requestInterceptor((request,body,execution) -> request.getURI().getPath().equals("/auth/me")
                ? new org.springframework.mock.http.client.MockClientHttpResponse(new byte[0], accountActive ? org.springframework.http.HttpStatus.OK : org.springframework.http.HttpStatus.FORBIDDEN)
                : execution.execute(request,body));
        core=MockRestServiceServer.bindTo(builder).build();
        access=new FinanceAccessService(SECRET,"wareflow-auth","http://core");
        ReflectionTestUtils.setField(access,"core",builder.build());
        reports=mock(FinanceReportService.class); finance=mock(FinanceService.class);
        mvc=MockMvcBuilders.standaloneSetup(new FinanceReportController(finance,access,reports))
            .setControllerAdvice(new FinanceExceptionHandler()).build();
    }
    String token(String role,boolean expired) {
        return "Bearer "+Jwts.builder().subject(user.toString()).issuer("wareflow-auth")
            .claim("role",role).claim("companyId",company.toString())
            .expiration(Date.from(Instant.now().plusSeconds(expired?-60:600)))
            .signWith(Keys.hmacShaKeyFor(Decoders.BASE64.decode(SECRET))).compact();
    }
    @Test void missingExpiredTokensAndCrossCompanyRejected() throws Exception {
        for (String path:List.of("/reports/finance","/reports/finance/timeseries","/reports/finance/categories")) {
            mvc.perform(get(path).param("period","2026")).andExpect(status().isUnauthorized());
            mvc.perform(get(path).param("period","2026").header("Authorization",token("COMPANY_ADMIN",true)))
                .andExpect(status().isUnauthorized());
            mvc.perform(get(path).param("period","2026").param("companyId",UUID.randomUUID().toString())
                .header("Authorization",token("COMPANY_ADMIN",false))).andExpect(status().isForbidden());
        }
        verifyNoInteractions(reports,finance);
    }
    @Test void invalidGroupingAndMissingPeriodRejected() throws Exception {
        mvc.perform(get("/reports/finance/timeseries").param("period","2026").param("groupBy","WEEK")
            .header("Authorization",token("COMPANY_ADMIN",false))).andExpect(status().isBadRequest());
        mvc.perform(get("/reports/finance/categories").header("Authorization",token("COMPANY_ADMIN",false)))
            .andExpect(status().isBadRequest());
        mvc.perform(get("/reports/finance/categories").param("period","2026")
            .header("Authorization",token("SYSTEM_ADMIN",false))).andExpect(status().isBadRequest());
        verifyNoInteractions(reports,finance);
    }
    @Test void timeseriesHasDocumentedShape() throws Exception {
        when(reports.timeseries(eq(company),isNull(),eq("2026-11"),eq(GroupBy.DAY),any()))
            .thenReturn(new FinanceTimeseries("2026-11","Asia/Ho_Chi_Minh",GroupBy.DAY,List.of(
                new FinanceTimeseries.Point(LocalDate.of(2026,11,1),BigDecimal.TEN,BigDecimal.ZERO,BigDecimal.ONE,new BigDecimal("9")))));
        mvc.perform(get("/reports/finance/timeseries").param("period","2026-11").param("groupBy","DAY")
            .header("Authorization",token("COMPANY_ADMIN",false)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.timezone").value("Asia/Ho_Chi_Minh"))
            .andExpect(jsonPath("$.points[0].date").value("2026-11-01"))
            .andExpect(jsonPath("$.points[0].net").value(9));
    }
    @Test void lockedAccountCannotReadCompanyWideReportsWithExistingToken() throws Exception {
        accountActive=false;
        mvc.perform(get("/reports/finance/timeseries").param("period","2026")
            .header("Authorization",token("COMPANY_ADMIN",false))).andExpect(status().isForbidden());
        verifyNoInteractions(reports,finance);
    }
    @Test void reportServicesRejectManagerWithoutWarehouse() {
        var manager=access.authenticate(token("WAREHOUSE_MANAGER",false),"WAREHOUSE_MANAGER");
        var realReports=new FinanceReportService(new FinancePeriods("Asia/Ho_Chi_Minh"),
            mock(com.example.finance_service.repository.FinanceReportRepository.class),access);
        assertEquals(400,assertThrows(ResponseStatusException.class,
            ()->realReports.timeseries(company,null,"2026",null,manager)).getStatusCode().value());
        assertEquals(400,assertThrows(ResponseStatusException.class,
            ()->realReports.categories(company,null,"2026",manager)).getStatusCode().value());
    }
    @Test void warehouseAssignmentAndOwnershipAreEnforced() {
        var manager=access.authenticate(token("WAREHOUSE_MANAGER",false),"WAREHOUSE_MANAGER");
        core.expect(anything()).andRespond(withSuccess(warehouseJson(UUID.randomUUID(),company),MediaType.APPLICATION_JSON));
        assertEquals(403,assertThrows(ResponseStatusException.class,()->access.warehouse(manager,warehouse,company)).getStatusCode().value());
        core.verify(); core.reset();
        core.expect(anything()).andRespond(withSuccess(warehouseJson(user,UUID.randomUUID()),MediaType.APPLICATION_JSON));
        assertEquals(403,assertThrows(ResponseStatusException.class,()->access.warehouse(manager,warehouse,company)).getStatusCode().value());
        core.verify(); core.reset();
        core.expect(anything()).andRespond(withSuccess(warehouseJson(user,company),MediaType.APPLICATION_JSON));
        assertDoesNotThrow(()->access.warehouse(manager,warehouse,company)); core.verify();
    }
    String warehouseJson(UUID manager,UUID owner) {
        return "{\"id\":\""+warehouse+"\",\"ownerCompanyId\":\""+owner+"\",\"handover\":{\"managerId\":\""+manager+"\"}}";
    }
}
