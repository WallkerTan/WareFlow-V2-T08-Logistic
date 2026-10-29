package com.example.core_service.repository;

import com.example.core_service.entity.SystemLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SystemLogRepository extends JpaRepository<SystemLog, Long> {
    List<SystemLog> findByCompany_IdOrderByCreatedAtDesc(UUID companyId);
}

