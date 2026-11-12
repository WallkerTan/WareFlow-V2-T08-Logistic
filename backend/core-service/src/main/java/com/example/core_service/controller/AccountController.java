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
    @PutMapping("/users/me") @AuditLog(action="UPDATE_PROFILE",targetType="User")
    public View profile(@Valid @RequestBody ProfileRequest request){return accounts.profile(request);}
    @PutMapping("/users/me/password") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void password(@Valid @RequestBody PasswordRequest request){accounts.password(request);}
    @GetMapping("/employees") public List<View> employees(){return accounts.employees();}
    @GetMapping("/employees/{id}") public View employee(@PathVariable UUID id){return accounts.employee(id);}
    @DeleteMapping("/employees/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @AuditLog(action="DISABLE_EMPLOYEE",targetType="User")
    public void removeEmployee(@PathVariable UUID id){accounts.removeEmployee(id);}
    @PostMapping("/employees") @ResponseStatus(HttpStatus.CREATED) @AuditLog(action="CREATE_EMPLOYEE",targetType="User")
    public View create(@Valid @RequestBody EmployeeRequest request){return accounts.create(request);}
    @PatchMapping("/employees/{id}") @AuditLog(action="UPDATE_EMPLOYEE",targetType="User")
    public View update(@PathVariable UUID id,@Valid @RequestBody EmployeeUpdate request){return accounts.update(id,request);}
}
