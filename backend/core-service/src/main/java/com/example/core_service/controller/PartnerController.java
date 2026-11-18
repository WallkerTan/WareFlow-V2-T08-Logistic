package com.example.core_service.controller;
import com.example.core_service.entity.*;
import com.example.core_service.entity.enums.CompanyBusinessModel;
import com.example.core_service.service.PartnerService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.web.bind.annotation.*;
@RestController @RequiredArgsConstructor
public class PartnerController {
    private final PartnerService service;
    @GetMapping("/suppliers")
    public Page<Partner> suppliers(@RequestParam(required = false) String search,
                                   @RequestParam(required = false) CompanyBusinessModel businessModel,
                                   Pageable page) {
        return service.list(search, businessModel, page);
    }
}
