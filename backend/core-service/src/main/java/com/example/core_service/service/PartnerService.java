package com.example.core_service.service;
import com.example.core_service.entity.*;
import com.example.core_service.entity.enums.*;
import com.example.core_service.repository.*;
import com.example.core_service.security.SecurityUtils;
import com.example.core_service.exception.ApiException;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.*;

@Service @RequiredArgsConstructor @Transactional
public class PartnerService {
    private final PartnerRepository partners;
    private final SupplierProductRepository products;
    private final CompanyRepository companies;
    public record Request(@NotBlank @Size(max=255) String name, CompanyBusinessModel businessModel,
                          @Email @Size(max=255) String email,@Size(max=50) String phone,@Size(max=500) String address) {}
    public record ProductRequest(@NotBlank @Size(max=100) String sku,@NotBlank @Size(max=255) String name,
                                 @Size(max=100) String unit,@NotNull @DecimalMin("0") BigDecimal price,@Size(max=2048) String image) {}
    public Page<Partner> list(String kind,String search,CompanyBusinessModel model,Pageable page) {
        UUID company=SecurityUtils.getCurrentCompanyId(); boolean system=system();
        if(!system && company==null) throw ApiException.forbidden("Tài khoản không thuộc công ty");
        CompanyBusinessModel own=system?null:companies.findById(company).orElseThrow(()->ApiException.notFound("Công ty không tồn tại")).getBusinessModel();
        return partners.findAll((root,q,cb)-> {
            var p=new ArrayList<jakarta.persistence.criteria.Predicate>();
            p.add(cb.equal(root.get("kind"),kind)); p.add(cb.isFalse(root.get("deleted")));
            if("CUSTOMER".equals(kind)) p.add(cb.equal(root.get("companyId"),company));
            else if(!system) p.add(cb.equal(root.get("businessModel"),own));
            if(model!=null) p.add(cb.equal(root.get("businessModel"),model));
            if(search!=null&&!search.isBlank()) p.add(cb.like(cb.lower(root.get("name")),"%"+search.trim().toLowerCase(Locale.ROOT)+"%"));
            return cb.and(p.toArray(jakarta.persistence.criteria.Predicate[]::new));
        },page);
    }
    public Partner get(String kind,UUID id,boolean write) {
        Partner p=partners.findById(id).filter(v->!v.isDeleted()&&kind.equals(v.getKind())).orElseThrow(()->ApiException.notFound("Không tìm thấy đối tác"));
        UUID company=SecurityUtils.getCurrentCompanyId();
        if("SUPPLIER".equals(kind)) {
            if(write&&!system()) throw ApiException.forbidden("Chỉ hệ thống quản lý nhà cung cấp");
            if(!system() && (company==null || !Objects.equals(p.getBusinessModel(),companies.findById(company).orElseThrow(()->ApiException.forbidden("Công ty không tồn tại")).getBusinessModel()))) throw ApiException.forbidden("Nhà cung cấp khác ngành kinh doanh");
        } else {
            if(company==null || !company.equals(p.getCompanyId())) throw ApiException.forbidden("Khách hàng không thuộc công ty");
            if(write&&SecurityUtils.getCurrentUserRole()!=UserRole.COMPANY_ADMIN) throw ApiException.forbidden("Chỉ công ty quản lý khách hàng");
        }
        return p;
    }
    public Partner save(String kind,UUID id,Request r) {
        Partner p;
        if(id==null) {
            if("SUPPLIER".equals(kind)?!system():SecurityUtils.getCurrentUserRole()!=UserRole.COMPANY_ADMIN) throw ApiException.forbidden("Không có quyền tạo đối tác");
            p=new Partner();p.setKind(kind);p.setCompanyId("CUSTOMER".equals(kind)?SecurityUtils.getCurrentCompanyId():null);
        } else p=get(kind,id,true);
        if("SUPPLIER".equals(kind)&&r.businessModel()==null) throw ApiException.badRequest("Nhà cung cấp cần ngành kinh doanh");
        p.setName(r.name().trim());p.setEmail(r.email());p.setPhone(r.phone());p.setAddress(r.address());p.setBusinessModel(r.businessModel());return partners.save(p);
    }
    public void delete(String kind,UUID id){Partner p=get(kind,id,true);p.setDeleted(true);partners.save(p);}
    public List<SupplierProduct> products(UUID supplier){get("SUPPLIER",supplier,false);return products.findBySupplierId(supplier);}
    public SupplierProduct product(UUID supplier,UUID id,ProductRequest r) {
        get("SUPPLIER",supplier,true);
        SupplierProduct p=id==null?new SupplierProduct():products.findById(id).filter(v->supplier.equals(v.getSupplierId())).orElseThrow(()->ApiException.notFound("Không tìm thấy sản phẩm nhà cung cấp"));
        String sku=r.sku().trim().toUpperCase(Locale.ROOT);
        if(products.existsBySupplierIdAndSkuIgnoreCaseAndIdNot(supplier,sku,id==null?new UUID(0,0):id)) throw ApiException.conflict("SKU đã tồn tại");
        p.setSupplierId(supplier);p.setSku(sku);p.setName(r.name().trim());p.setUnit(r.unit());p.setPrice(r.price());p.setImage(r.image());return products.save(p);
    }
    public void deleteProduct(UUID supplier,UUID id){get("SUPPLIER",supplier,true);var p=products.findById(id).filter(v->supplier.equals(v.getSupplierId())).orElseThrow(()->ApiException.notFound("Không tìm thấy sản phẩm"));products.delete(p);}
    private boolean system(){return SecurityUtils.getCurrentUserRole()==UserRole.SYSTEM_ADMIN;}
}
