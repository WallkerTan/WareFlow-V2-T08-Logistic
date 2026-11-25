package com.example.core_service.service;

import com.example.core_service.dto.request.CreateWarehouseRequest;
import com.example.core_service.dto.response.WarehouseResponse;
import com.example.core_service.entity.Warehouse;
import com.example.core_service.entity.enums.WarehouseStatus;
import com.example.core_service.entity.enums.WarehouseTransactionStatus;
import com.example.core_service.entity.enums.WarehouseType;
import com.example.core_service.exception.ApiException;
import com.example.core_service.repository.WarehouseRepository;
import com.example.core_service.repository.WarehouseTransactionRepository;
import jakarta.persistence.criteria.Predicate;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import com.example.core_service.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class WarehouseService {

    private final WarehouseRepository warehouseRepository;
    private final WarehouseTransactionRepository transactionRepository;

    @Transactional(readOnly = true)
    public Page<WarehouseResponse> myCompany(Pageable pageable) {
        UUID company = com.example.core_service.security.SecurityUtils.getCurrentCompanyId();
        if (company == null) throw ApiException.forbidden("Tài khoản không thuộc công ty");
        return warehouseRepository.findAll((root, query, cb) ->
                cb.equal(root.get("ownerCompany").get("id"), company), pageable)
                .map(WarehouseResponse::fromEntity);
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
    public record WarehouseProfileUpdate(@NotBlank @Size(max = 255) String name,
                                         @Size(max = 2000) String address,
                                         @Size(max = 2000) String avatar) {}

    public record SystemWarehouseUpdate(
            @NotBlank @Size(max = 255) String name,
            @NotBlank @Size(max = 255) String region,
            @Size(max = 2000) String address,
            @DecimalMin("0.01") @Digits(integer = 10, fraction = 2) BigDecimal area,
            @Size(max = 2000) String avatar,
            WarehouseType warehouseType,
            @DecimalMin("0") @Digits(integer = 13, fraction = 2) BigDecimal price) {}

    @Transactional
    public WarehouseResponse updateSystemWarehouse(UUID id, SystemWarehouseUpdate request) {
        Warehouse warehouse = warehouseRepository.locked(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy kho."));
        String name = request.name().trim();
        if (!name.equalsIgnoreCase(warehouse.getName()) && warehouseRepository.existsByNameIgnoreCase(name)) {
            throw ApiException.conflict("Tên kho đã tồn tại trên hệ thống.");
        }
        if (request.warehouseType() != null || request.price() != null) {
            if (warehouse.getStatus() != WarehouseStatus.AVAILABLE || warehouse.getOwnerCompany() != null) {
                throw ApiException.conflict("Chỉ kho hệ thống sẵn sàng giao dịch mới được đổi giá hoặc hình thức giao dịch.");
            }
            if (transactionRepository.existsByWarehouse_IdAndStatusIn(id, List.of(
                    WarehouseTransactionStatus.PENDING, WarehouseTransactionStatus.NEGOTIATING,
                    WarehouseTransactionStatus.APPROVED))) {
                throw ApiException.conflict("Kho đang có đề nghị giao dịch chưa hoàn tất.");
            }
            if (request.warehouseType() != null) warehouse.setWarehouseType(request.warehouseType());
            if (request.price() != null) warehouse.setPrice(request.price());
        }
        warehouse.setName(name);
        warehouse.setRegion(request.region().trim());
        if (request.address() != null) warehouse.setAddress(request.address().trim());
        if (request.area() != null) warehouse.setArea(request.area());
        if (request.avatar() != null) {
            String avatar = request.avatar().trim();
            warehouse.setAvatar(avatar.isEmpty() ? null : avatar);
        }
        return WarehouseResponse.fromEntity(warehouse);
    }

    @Transactional
    public WarehouseResponse updateAssignedProfile(UUID id, WarehouseProfileUpdate request) {
        Warehouse warehouse = warehouseRepository.locked(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy kho."));
        var companyId = SecurityUtils.getCurrentCompanyId();
        var manager = SecurityUtils.getCurrentUserId().toString();
        if (companyId == null || warehouse.getOwnerCompany() == null
                || !companyId.equals(warehouse.getOwnerCompany().getId())
                || warehouse.getHandover() == null
                || !manager.equals(String.valueOf(warehouse.getHandover().get("managerId")))) {
            throw ApiException.forbidden("Chỉ người được bàn giao kho có quyền cập nhật hồ sơ kho.");
        }
        warehouse.setName(request.name().trim());
        if (request.address() != null) warehouse.setAddress(request.address().trim());
        if (request.avatar() != null) {
            String avatar = request.avatar().trim();
            warehouse.setAvatar(avatar.isEmpty() ? null : avatar);
        }
        return WarehouseResponse.fromEntity(warehouse);
    }

}

