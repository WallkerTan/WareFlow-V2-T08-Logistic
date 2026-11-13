package com.example.core_service.controller;

import com.example.core_service.dto.request.CreateWarehouseRequest;
import com.example.core_service.dto.response.WarehouseResponse;
import com.example.core_service.entity.enums.WarehouseStatus;
import com.example.core_service.entity.enums.WarehouseType;
import com.example.core_service.service.WarehouseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/warehouses")
@RequiredArgsConstructor
public class WarehouseController {

    private final WarehouseService warehouseService;

    /**
     * SYSTEM_ADMIN: Tạo kho hệ thống mới (ownerCompany = null, status = AVAILABLE).
     * Endpoint: POST /api/core/warehouses
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public WarehouseResponse createSystemWarehouse(
            @Valid @RequestBody CreateWarehouseRequest request
    ) {
        return warehouseService.createSystemWarehouse(request);
    }

    /**
     * Xem danh sách kho đang bán/cho thuê với filter + phân trang.
     * - SYSTEM_ADMIN: xem tất cả kho (mọi status).
     * - Các role khác (COMPANY_ADMIN, WAREHOUSE_MANAGER): mặc định chỉ thấy kho AVAILABLE
     *   (trừ khi truyền tường minh param status).
     * Endpoint: GET /api/core/warehouses
     *
     * Query params:
     *   search        - tìm theo tên hoặc khu vực
     *   status        - AVAILABLE | PENDING | ACTIVE | RETURNED
     *   warehouseType - BUY | RENT
     *   region        - lọc theo khu vực
     *   page, size, sort - phân trang (mặc định size=20, sort=createdAt DESC)
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public Page<WarehouseResponse> getWarehouses(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) WarehouseStatus status,
            @RequestParam(required = false) WarehouseType warehouseType,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) java.math.BigDecimal minArea,
            @RequestParam(required = false) java.math.BigDecimal maxArea,
            @RequestParam(required = false) java.math.BigDecimal minPrice,
            @RequestParam(required = false) java.math.BigDecimal maxPrice,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return warehouseService.getWarehouses(search, status, warehouseType, region, minArea, maxArea, minPrice, maxPrice, pageable);
    }

    /**
     * Xem chi tiết 1 kho theo ID.
     * Endpoint: GET /api/core/warehouses/{id}
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public WarehouseResponse getWarehouseById(@PathVariable UUID id) {
        return warehouseService.getWarehouseById(id);
    }
}
