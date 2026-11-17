package com.example.core_service.service;

import com.example.core_service.dto.request.CreateWarehouseRequest;
import com.example.core_service.dto.response.WarehouseResponse;
import com.example.core_service.entity.Warehouse;
import com.example.core_service.entity.enums.WarehouseStatus;
import com.example.core_service.entity.enums.WarehouseType;
import com.example.core_service.exception.ApiException;
import com.example.core_service.repository.WarehouseRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class WarehouseService {

    private final WarehouseRepository warehouseRepository;

    /**
     * SYSTEM_ADMIN tạo kho hệ thống mới.
     * ownerCompany = null  →  kho chưa thuộc về tenant nào (kho sàn).
     * status mặc định = AVAILABLE.
     */
    @Transactional
    public WarehouseResponse createSystemWarehouse(CreateWarehouseRequest request) {
        if (warehouseRepository.existsByNameIgnoreCase(request.getName().trim())) {
            throw ApiException.conflict("Tên kho \"" + request.getName().trim() + "\" đã tồn tại trên hệ thống");
        }

        Warehouse warehouse = Warehouse.builder()
                .ownerCompany(null)                          // kho hệ thống: chưa có tenant sở hữu
                .name(request.getName().trim())
                .warehouseType(request.getWarehouseType())
                .area(request.getArea())
                .price(request.getPrice())
                .region(request.getRegion().trim())
                .address(request.getAddress() != null ? request.getAddress().trim() : null)
                .status(WarehouseStatus.AVAILABLE)           // luôn khởi tạo với trạng thái AVAILABLE
                .build();

        Warehouse saved = warehouseRepository.save(warehouse);
        log.info("System warehouse created: id={}, name={}, type={}", saved.getId(), saved.getName(), saved.getWarehouseType());
        return WarehouseResponse.fromEntity(saved);
    }

    /**
     * Lấy danh sách kho có filter + phân trang.
     * Dành cho:
     *   - SYSTEM_ADMIN: xem tất cả kho (mọi status, mọi loại).
     *   - Public / Tenant: xem kho đang bán/cho thuê (status = AVAILABLE).
     *
     * @param search        Tìm theo tên kho hoặc khu vực (không phân biệt hoa/thường)
     * @param status        Lọc theo trạng thái kho (AVAILABLE, PENDING, ACTIVE, RETURNED)
     * @param warehouseType Lọc theo loại kho (BUY, RENT)
     * @param region        Lọc theo khu vực (contains, không phân biệt hoa/thường)
     * @param pageable      Phân trang & sắp xếp
     */
    @Transactional(readOnly = true)
    public Page<WarehouseResponse> getWarehouses(
            String search,
            WarehouseStatus status,
            WarehouseType warehouseType,
            String region,
            Pageable pageable
    ) {
        Specification<Warehouse> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Tìm kiếm tên kho hoặc khu vực
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                Predicate byName = cb.like(cb.lower(root.get("name")), pattern);
                Predicate byRegion = cb.like(cb.lower(root.get("region")), pattern);
                predicates.add(cb.or(byName, byRegion));
            }

            // Lọc theo trạng thái
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            // Lọc theo loại kho
            if (warehouseType != null) {
                predicates.add(cb.equal(root.get("warehouseType"), warehouseType));
            }

            // Lọc theo khu vực (chính xác hơn tìm kiếm tổng quát)
            if (region != null && !region.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("region")), "%" + region.trim().toLowerCase() + "%"));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return warehouseRepository.findAll(spec, pageable).map(WarehouseResponse::fromEntity);
    }

    /**
     * Xem chi tiết 1 kho theo ID.
     */
    @Transactional(readOnly = true)
    public WarehouseResponse getWarehouseById(UUID id) {
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy kho với ID: " + id));
        return WarehouseResponse.fromEntity(warehouse);
    }
}

