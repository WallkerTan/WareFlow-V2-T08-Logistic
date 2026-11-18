package com.example.core_service.service;
import com.example.core_service.entity.*;
import com.example.core_service.entity.enums.*;
import com.example.core_service.repository.*;
import com.example.core_service.security.SecurityUtils;
import com.example.core_service.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service @RequiredArgsConstructor @Transactional(readOnly = true)
public class PartnerService {
    private final PartnerRepository partners;
    private final CompanyRepository companies;
    public Page<Partner> list(String search,CompanyBusinessModel model,Pageable page) {
        UUID company=SecurityUtils.getCurrentCompanyId(); boolean system=system();
        if(!system && company==null) throw ApiException.forbidden("Tài khoản không thuộc công ty");
        CompanyBusinessModel own=system?null:companies.findById(company).orElseThrow(()->ApiException.notFound("Công ty không tồn tại")).getBusinessModel();
        return partners.findAll((root,q,cb)-> {
            var p=new ArrayList<jakarta.persistence.criteria.Predicate>();
            p.add(cb.equal(root.get("kind"),"SUPPLIER")); p.add(cb.isFalse(root.get("deleted")));
            if(!system) p.add(cb.equal(root.get("businessModel"),own));
            if(model!=null) p.add(cb.equal(root.get("businessModel"),model));
            if(search!=null&&!search.isBlank()) p.add(cb.like(cb.lower(root.get("name")),"%"+search.trim().toLowerCase(Locale.ROOT)+"%"));
            return cb.and(p.toArray(jakarta.persistence.criteria.Predicate[]::new));
        },page);
    }
    private boolean system(){return SecurityUtils.getCurrentUserRole()==UserRole.SYSTEM_ADMIN;}
}
