package com.example.core_service.controller;

import com.example.core_service.service.AccountService;
import com.example.core_service.service.AccountService.*;
import com.example.core_service.log.AuditLog;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import java.util.*;

@RestController @RequiredArgsConstructor
public class AccountController {
    private final AccountService accounts;
    @GetMapping("/users/me") public View me(){return accounts.me();}
    @GetMapping("/employees") public List<View> employees(){return accounts.employees();}
    @PostMapping("/employees") @ResponseStatus(HttpStatus.CREATED) @AuditLog(action="CREATE_EMPLOYEE",targetType="User")
    public View create(@Valid @RequestBody EmployeeRequest request){return accounts.create(request);}
}
