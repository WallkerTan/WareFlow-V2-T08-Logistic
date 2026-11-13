package com.example.core_service.repository;

import com.example.core_service.entity.SystemLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface SystemLogRepository extends JpaRepository<SystemLog, Long>, JpaSpecificationExecutor<SystemLog> {

    List<SystemLog> findByCompany_IdOrderByCreatedAtDesc(UUID companyId);

    @Query(value = "SELECT cast(created_at as date) as logDate, count(*) as count " +
            "FROM system_logs " +
            "WHERE (:companyId IS NULL OR company_id = :companyId) " +
            "  AND created_at >= :startDate " +
            "GROUP BY cast(created_at as date) " +
            "ORDER BY logDate DESC", nativeQuery = true)
    List<Object[]> countLogsGroupedByDateNative(@Param("companyId") UUID companyId,
                                                @Param("startDate") Instant startDate);
}
