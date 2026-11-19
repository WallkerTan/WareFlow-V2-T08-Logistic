package com.example.core_service.service;

import com.example.core_service.dto.request.SupplierRequest;
import com.example.core_service.dto.request.SupplierProductRequest;
import com.example.core_service.entity.Supplier;
import com.example.core_service.entity.enums.UserRole;
import com.example.core_service.exception.ApiException;
import com.example.core_service.repository.CompanyRepository;
import com.example.core_service.repository.SupplierRepository;
import com.example.core_service.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
public class SupplierService {
    private final SupplierRepository suppliers;
    private final CompanyRepository companies;

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> list(Pageable pageable) {
        var user = SecurityUtils.getCurrentUser();
        return suppliers.findAll((root, query, cb) -> {
            var visible = cb.isNull(root.get("company"));
            if (user.getRole() == UserRole.SYSTEM_ADMIN) visible = cb.conjunction();
            else if (user.getCompanyId() != null) visible = cb.or(visible, cb.equal(root.get("company").get("id"), user.getCompanyId()));
            return cb.and(cb.isNull(root.get("deletedAt")), visible);
        }, pageable).map(this::response);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> get(UUID id) { return response(accessible(id, false)); }

    public Map<String, Object> save(UUID id, SupplierRequest request) {
        var user = SecurityUtils.getCurrentUser();
        if (user.getRole() == UserRole.WAREHOUSE_MANAGER) throw ApiException.forbidden("Chỉ quản trị viên có thể sửa nhà cung cấp");
        Supplier supplier = id == null ? new Supplier() : accessible(id, true);
        if (id == null && user.getRole() != UserRole.SYSTEM_ADMIN) {
            if (user.getCompanyId() == null) throw ApiException.forbidden("Tài khoản chưa thuộc công ty");
            supplier.setCompany(companies.findById(user.getCompanyId()).orElseThrow(() -> ApiException.notFound("Không tìm thấy công ty")));
        }
        supplier.setName(request.name().trim());
        supplier.setCategory(request.businessModel().name());
        Map<String, Object> contact = new LinkedHashMap<>();
        contact.put("contactPerson", clean(request.contactPerson())); contact.put("phone", clean(request.phone()));
        contact.put("email", clean(request.email())); contact.put("address", clean(request.address()));
        supplier.setContact(contact);
        return response(suppliers.save(supplier));
    }

    public void delete(UUID id) { accessible(id, true).setDeletedAt(Instant.now()); }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> products(UUID id) { return catalog(accessible(id, false)); }

    public Map<String, Object> saveProduct(UUID id, UUID productId, SupplierProductRequest request) {
        Supplier supplier = accessible(id, true);
        var products = catalog(supplier);
        String sku = request.sku().trim();
        if (products.stream().anyMatch(p -> sku.equalsIgnoreCase(String.valueOf(p.get("sku"))) && !Objects.equals(String.valueOf(productId), p.get("id"))))
            throw ApiException.conflict("Mã sản phẩm đã tồn tại ở nhà cung cấp này");
        Map<String, Object> product = productId == null ? new LinkedHashMap<>() : products.stream()
                .filter(p -> productId.toString().equals(p.get("id"))).findFirst().orElseThrow(() -> ApiException.notFound("Không tìm thấy sản phẩm của nhà cung cấp"));
        if (productId == null) { product.put("id", UUID.randomUUID().toString()); products.add(product); }
        product.put("sku", sku); product.put("name", request.name().trim()); product.put("unit", request.unit().trim());
        product.put("price", request.price()); product.put("barcode", clean(request.barcode())); product.put("image", clean(request.image()));
        product.put("updatedAt", Instant.now().toString());
        supplier.setProducts(products);
        return product;
    }

    public void deleteProduct(UUID id, UUID productId) {
        Supplier supplier = accessible(id, true);
        var products = catalog(supplier);
        if (!products.removeIf(p -> productId.toString().equals(p.get("id")))) throw ApiException.notFound("Không tìm thấy sản phẩm");
        supplier.setProducts(products);
    }

    private Supplier accessible(UUID id, boolean write) {
        Supplier supplier = (write ? suppliers.findForUpdate(id) : suppliers.findById(id))
                .filter(s -> s.getDeletedAt() == null).orElseThrow(() -> ApiException.notFound("Không tìm thấy nhà cung cấp"));
        var user = SecurityUtils.getCurrentUser();
        if (user.getRole() == UserRole.SYSTEM_ADMIN) return supplier;
        boolean own = supplier.getCompany() != null && supplier.getCompany().getId().equals(user.getCompanyId());
        if (write ? user.getRole() != UserRole.COMPANY_ADMIN || !own : supplier.getCompany() != null && !own)
            throw ApiException.forbidden("Bạn không có quyền truy cập nhà cung cấp này");
        return supplier;
    }

    private Map<String, Object> response(Supplier supplier) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", supplier.getId()); result.put("name", supplier.getName()); result.put("businessModel", supplier.getCategory());
        result.put("companyId", supplier.getCompany() == null ? null : supplier.getCompany().getId());
        result.put("kind", supplier.getCompany() == null ? "SYSTEM" : "COMPANY");
        if (supplier.getContact() != null) result.putAll(supplier.getContact());
        result.put("productCount", catalog(supplier).size()); result.put("createdAt", supplier.getCreatedAt());
        return result;
    }

    private List<Map<String, Object>> catalog(Supplier supplier) {
        List<Map<String, Object>> result = new ArrayList<>();
        if (supplier.getProducts() instanceof List<?> list) for (Object item : list) {
            if (!(item instanceof Map<?, ?> source)) continue;
            Map<String, Object> product = new LinkedHashMap<>();
            source.forEach((key, value) -> product.put(String.valueOf(key), value));
            String legacyKey = supplier.getId() + ":" + result.size() + ":" + product.get("sku");
            product.put("id", String.valueOf(product.getOrDefault("id", UUID.nameUUIDFromBytes(legacyKey.getBytes(StandardCharsets.UTF_8)))));
            result.add(product);
        }
        return result;
    }

    private String clean(String value) { return value == null ? "" : value.trim(); }
}
