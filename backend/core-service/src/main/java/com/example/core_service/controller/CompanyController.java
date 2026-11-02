package com.example.core_service.controller;

import com.example.core_service.dto.request.UpdateCompanyProfileRequest;
import com.example.core_service.dto.request.UpdateCompanyStatusRequest;
import com.example.core_service.dto.response.CompanyResponse;
import com.example.core_service.entity.enums.CompanyBusinessModel;
import com.example.core_service.entity.enums.CompanyStatus;
import com.example.core_service.service.CompanyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/companies")
@RequiredArgsConstructor
public class CompanyController {

    private final CompanyService companyService;

    /**
     * SYSTEM_ADMIN: Lấy danh sách tất cả các công ty (tìm kiếm, lọc status/businessModel, phân trang).
     */
    @GetMapping
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public Page<CompanyResponse> getAllCompanies(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) CompanyStatus status,
            @RequestParam(required = false) CompanyBusinessModel businessModel,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return companyService.getAllCompanies(search, status, businessModel, pageable);
    }

    /**
     * COMPANY_ADMIN: Lấy thông tin công ty hiện tại của tài khoản đang đăng nhập.
     */
    @GetMapping("/my-company")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public CompanyResponse getMyCompany() {
        return companyService.getMyCompany();
    }

    /**
     * Xem chi tiết 1 công ty theo ID (SYSTEM_ADMIN hoặc COMPANY_ADMIN của chính công ty đó).
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('SYSTEM_ADMIN') or (hasRole('COMPANY_ADMIN') and @securityUtils.isCompanyOwner(#id))")
    public CompanyResponse getCompanyById(@PathVariable UUID id) {
        return companyService.getCompanyById(id);
    }

    /**
     * SYSTEM_ADMIN: Cập nhật trạng thái công ty (LOCKED / ACTIVE / PENDING).
     */
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public CompanyResponse updateCompanyStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateCompanyStatusRequest request
    ) {
        return companyService.updateCompanyStatus(id, request);
    }

    /**
     * SYSTEM_ADMIN: Tiện ích khóa công ty nhanh chóng.
     */
    @PutMapping("/{id}/lock")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public CompanyResponse lockCompany(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String reason = body != null ? body.get("reason") : "Bị khóa bởi quản trị viên hệ thống";
        return companyService.lockCompany(id, reason);
    }

    /**
     * SYSTEM_ADMIN: Tiện ích mở khóa công ty nhanh chóng.
     */
    @PutMapping("/{id}/unlock")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public CompanyResponse unlockCompany(@PathVariable UUID id) {
        return companyService.unlockCompany(id);
    }

    /**
     * Cập nhật thông tin profile công ty (SYSTEM_ADMIN hoặc COMPANY_ADMIN của chính công ty).
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SYSTEM_ADMIN') or (hasRole('COMPANY_ADMIN') and @securityUtils.isCompanyOwner(#id))")
    public CompanyResponse updateCompanyProfile(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateCompanyProfileRequest request
    ) {
        return companyService.updateCompanyProfile(id, request);
    }
}

