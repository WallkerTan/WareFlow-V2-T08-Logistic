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

    @Transactional(readOnly = true)
    public Page<WarehouseResponse> getWarehouses(String search, WarehouseStatus status, WarehouseType type,
            String region, java.math.BigDecimal minArea, java.math.BigDecimal maxArea,
            java.math.BigDecimal minPrice, java.math.BigDecimal maxPrice, Pageable page) {
        range(minArea,maxArea); range(minPrice,maxPrice);
        Specification<Warehouse> filter=(root,q,cb)-> {
            var p=new ArrayList<Predicate>();
            if(search!=null&&!search.isBlank()) p.add(cb.or(cb.like(cb.lower(root.get("name")),"%"+search.trim().toLowerCase()+"%"),cb.like(cb.lower(root.get("region")),"%"+search.trim().toLowerCase()+"%")));
            if(status!=null)p.add(cb.equal(root.get("status"),status));
            if(type!=null)p.add(cb.equal(root.get("warehouseType"),type));
            if(region!=null&&!region.isBlank())p.add(cb.like(cb.lower(root.get("region")),"%"+region.trim().toLowerCase()+"%"));
            if(minArea!=null)p.add(cb.greaterThanOrEqualTo(root.get("area"),minArea));
            if(maxArea!=null)p.add(cb.lessThanOrEqualTo(root.get("area"),maxArea));
            if(minPrice!=null)p.add(cb.greaterThanOrEqualTo(root.get("price"),minPrice));
            if(maxPrice!=null)p.add(cb.lessThanOrEqualTo(root.get("price"),maxPrice));
            if(com.example.core_service.security.SecurityUtils.getCurrentUserRole()!=com.example.core_service.entity.enums.UserRole.SYSTEM_ADMIN) {
                UUID company=com.example.core_service.security.SecurityUtils.getCurrentCompanyId();
                p.add(company==null?cb.equal(root.get("status"),WarehouseStatus.AVAILABLE):cb.or(cb.equal(root.get("status"),WarehouseStatus.AVAILABLE),cb.equal(root.get("ownerCompany").get("id"),company)));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
        return warehouseRepository.findAll(filter,page).map(WarehouseResponse::fromEntity);
    }
    private void range(java.math.BigDecimal min,java.math.BigDecimal max) {
        if((min!=null&&min.signum()<0)||(max!=null&&max.signum()<0)||(min!=null&&max!=null&&min.compareTo(max)>0))
            throw ApiException.badRequest("Khoảng lọc không hợp lệ");
    }

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
        return getWarehouses(search,status,warehouseType,region,null,null,null,null,pageable);
    }

    /**
     * Xem chi tiết 1 kho theo ID.
     */
    @Transactional(readOnly = true)
    public WarehouseResponse getWarehouseById(UUID id) {
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy kho với ID: " + id));
        if (com.example.core_service.security.SecurityUtils.getCurrentUserRole() != com.example.core_service.entity.enums.UserRole.SYSTEM_ADMIN
                && warehouse.getStatus() != WarehouseStatus.AVAILABLE
                && (warehouse.getOwnerCompany() == null || !warehouse.getOwnerCompany().getId().equals(com.example.core_service.security.SecurityUtils.getCurrentCompanyId())))
            throw ApiException.forbidden("Kho không thuộc công ty của bạn");
        return WarehouseResponse.fromEntity(warehouse);
    }
}
