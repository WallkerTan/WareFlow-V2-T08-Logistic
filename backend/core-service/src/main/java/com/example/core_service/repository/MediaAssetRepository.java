package com.example.core_service.repository;
import com.example.core_service.entity.MediaAsset;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
import java.util.Optional;
public interface MediaAssetRepository extends JpaRepository<MediaAsset,String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select a from MediaAsset a where a.publicId = :id")
    Optional<MediaAsset> lock(String id);
}
