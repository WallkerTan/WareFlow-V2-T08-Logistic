package com.example.inventory_service.service;

import com.example.inventory_service.dto.ProductRequest;
import com.example.inventory_service.dto.ProductResponse;
import com.example.inventory_service.dto.StockLotRequest;
import com.example.inventory_service.dto.StockLotResponse;
import com.example.inventory_service.entity.Product;
import com.example.inventory_service.entity.StockLot;
import com.example.inventory_service.entity.enums.StockLotStatus;
import com.example.inventory_service.repository.ProductRepository;
import com.example.inventory_service.repository.StockLotRepository;
import com.example.inventory_service.repository.StockMovementRepository;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class InventoryCatalogService {
    private static final int NEAR_EXPIRY_DAYS = 30;
    private final ProductRepository products;
    private final StockLotRepository lots;
    private final StockMovementRepository movements;

    @Transactional(readOnly = true)
    public Page<ProductResponse> listProducts(UUID warehouseId, String search, String unit, Boolean belowMin, Pageable pageable) {
        Specification<Product> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("warehouseId"), warehouseId));
            predicates.add(cb.isNull(root.get("deletedAt")));
            if (search != null && !search.isBlank()) {
                String value = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(cb.like(cb.lower(root.get("name")), value),
                        cb.like(cb.lower(root.get("sku")), value), cb.like(cb.lower(root.get("barcode")), value)));
            }
            if (unit != null && !unit.isBlank()) predicates.add(cb.equal(cb.lower(root.get("unit")), unit.trim().toLowerCase()));
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        if (belowMin == null) return products.findAll(spec, pageable).map(this::response);
        List<ProductResponse> results = products.findAll(spec, pageable.getSort()).stream().map(this::response)
                .filter(response -> belowMin == null || belowMin == response.belowMinStock()).toList();
        int start = (int) Math.min(pageable.getOffset(), results.size());
        int end = Math.min(start + pageable.getPageSize(), results.size());
        return new PageImpl<>(results.subList(start, end), pageable, results.size());
    }

    @Transactional(readOnly = true)
    public ProductResponse getProduct(UUID warehouseId, UUID productId) { return response(product(warehouseId, productId)); }

    @Transactional
    public ProductResponse createProduct(UUID warehouseId, ProductRequest request) {
        String sku = request.sku().trim();
        if (products.existsByWarehouseIdAndSkuIgnoreCaseAndDeletedAtIsNull(warehouseId, sku)) conflict("SKU đã tồn tại trong kho");
        Product product = Product.builder().warehouseId(warehouseId).sku(sku).barcode(trim(request.barcode()))
                .name(request.name().trim()).unit(trim(request.unit())).images(request.images())
                .minStock(request.minStock()).build();
        try { return response(products.save(product)); }
        catch (DataIntegrityViolationException ex) { conflict("SKU đã tồn tại trong kho"); return null; }
    }

    @Transactional
    public ProductResponse updateProduct(UUID warehouseId, UUID productId, ProductRequest request) {
        Product product = product(warehouseId, productId);
        String sku = request.sku().trim();
        if (products.existsByWarehouseIdAndSkuIgnoreCaseAndIdNotAndDeletedAtIsNull(warehouseId, sku, productId)) conflict("SKU đã tồn tại trong kho");
        product.setSku(sku); product.setBarcode(trim(request.barcode())); product.setName(request.name().trim());
        product.setUnit(trim(request.unit())); product.setImages(request.images()); product.setMinStock(request.minStock());
        try { return response(products.save(product)); }
        catch (DataIntegrityViolationException ex) { conflict("SKU đã tồn tại trong kho"); return null; }
    }

    @Transactional
    public void deleteProduct(UUID warehouseId, UUID productId) {
        Product product = product(warehouseId, productId);
        BigDecimal quantity = lots.sumQuantity(productId);
        BigDecimal reserved = lots.sumReserved(productId);
        if ((quantity != null && quantity.signum() > 0) || (reserved != null && reserved.signum() > 0))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Không thể xóa sản phẩm còn tồn kho; hãy xử lý tồn bằng phiếu trước");
        product.setDeletedAt(Instant.now());
        products.save(product);
    }

    @Transactional(readOnly = true)
    public List<StockLotResponse> listLots(UUID warehouseId, UUID productId, StockLotStatus filter) {
        product(warehouseId, productId);
        return lots.findByProduct_IdAndDeletedAtIsNull(productId).stream()
                .map(lot -> StockLotResponse.from(lot, effectiveStatus(lot)))
                .filter(lot -> filter == null || lot.status() == filter).toList();
    }

    @Transactional(readOnly = true)
    public StockLotResponse getLot(UUID warehouseId, UUID productId, UUID lotId) {
        StockLot lot = lot(warehouseId, productId, lotId);
        return StockLotResponse.from(lot, effectiveStatus(lot));
    }

    @Transactional
    public StockLotResponse createLot(UUID warehouseId, UUID productId, StockLotRequest request) {
        Product product = product(warehouseId, productId);
        StockLot lot = StockLot.builder().product(product).lotCode(request.lotCode().trim())
                .expiryDate(request.expiryDate()).quantity(BigDecimal.ZERO).reserved(BigDecimal.ZERO)
                .status(StockLotStatus.OK).build();
        return StockLotResponse.from(lots.save(lot), effectiveStatus(lot));
    }

    @Transactional
    public StockLotResponse updateLotMetadata(UUID warehouseId, UUID productId, UUID lotId, StockLotRequest request) {
        StockLot lot = lot(warehouseId, productId, lotId);
        lot.setLotCode(request.lotCode().trim()); lot.setExpiryDate(request.expiryDate());
        return StockLotResponse.from(lots.save(lot), effectiveStatus(lot));
    }

    @Transactional
    public StockLotResponse setLotCondition(UUID warehouseId, UUID productId, UUID lotId, StockLotStatus status) {
        if (status != StockLotStatus.OK && status != StockLotStatus.DAMAGED)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ được đánh dấu OK hoặc DAMAGED; trạng thái hạn dùng được tính tự động");
        StockLot lot = lot(warehouseId, productId, lotId); lot.setStatus(status); lots.save(lot);
        return StockLotResponse.from(lot, effectiveStatus(lot));
    }

    @Transactional
    public void deleteLot(UUID warehouseId, UUID productId, UUID lotId) {
        StockLot lot = lot(warehouseId, productId, lotId);
        if (movements.existsByLot_Id(lotId)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Không thể xóa lô đã có biến động kho");
        if (lot.getQuantity().signum() != 0 || lot.getReserved().signum() != 0)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Chỉ có thể xóa lô chưa phát sinh số lượng");
        lot.setDeletedAt(Instant.now()); lots.save(lot);
    }

    @Transactional(readOnly = true)
    public ProductResponse response(Product product) {
        List<StockLot> productLots = lots.findByProduct_IdAndDeletedAtIsNull(product.getId());
        BigDecimal quantity = productLots.stream().map(StockLot::getQuantity).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal available = productLots.stream()
                .filter(lot -> effectiveStatus(lot) == StockLotStatus.OK || effectiveStatus(lot) == StockLotStatus.NEAR_EXPIRY)
                .map(lot -> lot.getQuantity().subtract(lot.getReserved()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return ProductResponse.from(product, quantity, available);
    }

    private Product product(UUID warehouseId, UUID productId) {
        return products.findByIdAndWarehouseIdAndDeletedAtIsNull(productId, warehouseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy hàng hóa trong kho"));
    }
    private StockLot lot(UUID warehouseId, UUID productId, UUID lotId) {
        return lots.findByIdAndProduct_IdAndProduct_WarehouseIdAndDeletedAtIsNull(lotId, productId, warehouseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy lô hàng trong kho"));
    }
    private StockLotStatus effectiveStatus(StockLot lot) {
        if (lot.getStatus() == StockLotStatus.DAMAGED) return StockLotStatus.DAMAGED;
        if (lot.getExpiryDate() == null) return StockLotStatus.OK;
        LocalDate today = LocalDate.now();
        if (lot.getExpiryDate().isBefore(today)) return StockLotStatus.EXPIRED;
        if (!lot.getExpiryDate().isAfter(today.plusDays(NEAR_EXPIRY_DAYS))) return StockLotStatus.NEAR_EXPIRY;
        return StockLotStatus.OK;
    }
    private static String trim(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private static void conflict(String message) { throw new ResponseStatusException(HttpStatus.CONFLICT, message); }
}
