package com.example.core_service.controller;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
@RestController @RequiredArgsConstructor @PreAuthorize("hasRole('SYSTEM_ADMIN')")
public class SystemReportController {
    private final JdbcTemplate jdbc;
    @Value("${FINANCE_SERVICE_URL:http://localhost:8083}") private String financeUrl;
    @GetMapping("/reports/system")
    public Map<String,Object> summary(){
        Map<String,Object> result=new LinkedHashMap<>();
        result.put("companies",jdbc.queryForObject("select count(*) from companies where status <> 'DELETED'",Long.class));
        result.put("pendingCompanies",jdbc.queryForObject("select count(*) from companies where status = 'PENDING'",Long.class));
        result.put("warehouses",jdbc.queryForObject("select count(*) from warehouses",Long.class));
        result.put("completedWarehouseTransactions",jdbc.queryForObject("select count(*) from warehouse_transactions where status='COMPLETED' and type in ('BUY','RENT')",Long.class));
        result.put("platformRevenue",jdbc.queryForObject("select coalesce(sum(platform_fee),0) from warehouse_transactions where status='COMPLETED' and type in ('BUY','RENT')",java.math.BigDecimal.class));
        result.put("pendingFinanceEvents",jdbc.queryForObject("select count(*) from finance_events where delivered_at is null",Long.class));return result;
    }
    @GetMapping("/reports/companies/rankings")
    public List<Map<String,Object>> rankings(@RequestHeader("Authorization") String auth,@RequestParam(defaultValue="warehouses") String metric,@RequestParam(defaultValue="20") int limit){
        if(limit<1||limit>1000)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"limit phải trong khoảng 1-1000");
        if("revenue".equals(metric)){
            try{
                var factory=new org.springframework.http.client.SimpleClientHttpRequestFactory();factory.setConnectTimeout(5000);factory.setReadTimeout(10000);
                var list=RestClient.builder().baseUrl(financeUrl).requestFactory(factory).build().get().uri("/reports/finance/companies?metric=revenue&limit={limit}",limit).header("Authorization",auth).retrieve().body(new org.springframework.core.ParameterizedTypeReference<List<Map<String,Object>>>(){});
                if(list==null)return List.of();
                for(var row:list){var names=jdbc.queryForList("select name from companies where id=?",UUID.fromString(row.get("company_id").toString()));row.put("companyName",names.isEmpty()?null:names.getFirst().get("name"));}return list;
            }catch(Exception ex){throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Không lấy được doanh thu từ finance-service");}
        }
        String order=switch(metric){case "warehouses"->"warehouse_count";case "transactions"->"transaction_count";default->throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"metric không hợp lệ");};
        return jdbc.queryForList("select c.id as company_id,c.name,coalesce(w.total,0) as warehouse_count,coalesce(t.total,0) as transaction_count,coalesce(t.fees,0) as platform_fee from companies c left join (select owner_company_id,count(*) total from warehouses group by owner_company_id) w on w.owner_company_id=c.id left join (select company_id,count(*) total,sum(platform_fee) fees from warehouse_transactions where status='COMPLETED' group by company_id) t on t.company_id=c.id where c.status <> 'DELETED' order by "+order+" desc,c.id limit ?",limit);
    }
}
