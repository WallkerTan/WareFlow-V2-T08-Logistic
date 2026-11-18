package com.example.core_service.repository;
import com.example.core_service.entity.Partner;
import org.springframework.data.jpa.repository.*;
import java.util.UUID;
public interface PartnerRepository extends JpaRepository<Partner,UUID>,JpaSpecificationExecutor<Partner> {}
