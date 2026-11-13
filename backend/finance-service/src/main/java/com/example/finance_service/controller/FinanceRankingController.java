package com.example.finance_service.controller;
import com.example.finance_service.security.FinanceAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
@RestController @RequiredArgsConstructor
public class FinanceRankingController {
    private final FinanceAccessService access;
    private final JdbcTemplate jdbc;
    @GetMapping("/reports/finance/companies")
    public List<Map<String,Object>> companies(@RequestHeader(value="Authorization",required=false) String auth,
        @RequestParam(defaultValue="revenue") String metric,@RequestParam(defaultValue="100") int limit){
        access.authenticate(auth,"SYSTEM_ADMIN");
        String order=switch(metric){case "revenue"->"revenue";case "transactions"->"transaction_count";default->throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid ranking metric");};
        if(limit<1||limit>1000)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"limit must be between 1 and 1000");
        return jdbc.queryForList("select company_id, count(*) as transaction_count, coalesce(sum(case when type='INCOME' then amount else 0 end),0) as revenue, coalesce(sum(case when type='EXPENSE' then amount else 0 end),0) as expense, coalesce(sum(case when type='SYSTEM_FEE' then amount else 0 end),0) as system_fee from transactions group by company_id order by "+order+" desc, company_id limit ?",limit);
    }
}
