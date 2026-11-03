package com.example.core_service.controller;

import com.example.core_service.dto.response.DailyLogSummaryResponse;
import com.example.core_service.dto.response.SystemLogResponse;
import com.example.core_service.security.SecurityUtils;
import com.example.core_service.service.SystemLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/system-logs")
@RequiredArgsConstructor
public class SystemLogController {

    private final SystemLogService systemLogService;

    /**
     * SYSTEM_ADMIN: Tra cứu nhật ký hệ thống toàn diện theo từng ngày hoặc khoảng ngày.
     *
     * @param date      Lọc chính xác trong 1 ngày (định dạng yyyy-MM-dd, vd: 2026-11-01)
     * @param fromDate  Từ ngày
     * @param toDate    Đến ngày
     * @param action    Tên hành động (vd: LOGIN, LOCK_COMPANY, UPLOAD_IMAGE...)
     * @param companyId Lọc theo công ty
     * @param actorId   Lọc theo người thực hiện
     * @param search    Tìm kiếm theo từ khóa
     */
    @GetMapping
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public Page<SystemLogResponse> getSystemLogs(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) UUID companyId,
            @RequestParam(required = false) UUID actorId,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return systemLogService.getLogs(date, fromDate, toDate, action, companyId, actorId, search, pageable);
    }

    /**
     * COMPANY_ADMIN: Tra cứu nhật ký hoạt động thuộc công ty mình theo từng ngày.
     */
    @GetMapping("/my-company")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public Page<SystemLogResponse> getMyCompanyLogs(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) UUID actorId,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return systemLogService.getMyCompanyLogs(date, fromDate, toDate, action, actorId, search, pageable);
    }

    /**
     * Lấy chi tiết 1 bản ghi nhật ký hệ thống theo ID.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('SYSTEM_ADMIN') or hasRole('COMPANY_ADMIN')")
    public SystemLogResponse getLogById(@PathVariable Long id) {
        return systemLogService.getLogById(id);
    }

    /**
     * SYSTEM_ADMIN: Thống kê số lượng log theo từng ngày (mặc định 7 ngày gần nhất).
     */
    @GetMapping("/statistics")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public List<DailyLogSummaryResponse> getDailyStatistics(
            @RequestParam(required = false) UUID companyId,
            @RequestParam(defaultValue = "7") int days
    ) {
        return systemLogService.getDailyStatistics(companyId, days);
    }

    /**
     * COMPANY_ADMIN: Thống kê số lượng log của công ty mình theo từng ngày.
     */
    @GetMapping("/my-company/statistics")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public List<DailyLogSummaryResponse> getMyCompanyDailyStatistics(
            @RequestParam(defaultValue = "7") int days
    ) {
        UUID companyId = SecurityUtils.getCurrentCompanyId();
        return systemLogService.getDailyStatistics(companyId, days);
    }
}

