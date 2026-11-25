package com.example.core_service.repository;
import com.example.core_service.entity.Partner;
import org.springframework.data.jpa.repository.*;
import java.util.UUID;
import java.util.List;
import java.util.Optional;
public interface PartnerRepository extends JpaRepository<Partner,UUID>,JpaSpecificationExecutor<Partner> {
    List<Partner> findByKindAndCompanyIdIsNullAndDeletedFalseOrderByNameAsc(String kind);
    Optional<Partner> findByIdAndKindAndCompanyIdIsNullAndDeletedFalse(UUID id, String kind);
}
