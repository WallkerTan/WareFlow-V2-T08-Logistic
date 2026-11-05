package com.example.core_service.dto.response;

import com.example.core_service.entity.SystemLog;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record SystemLogResponse(
        Long id,
        UUID actorId,
        String actorName,
        String actorEmail,
        UUID companyId,
        String companyName,
        String action,
        Map<String, Object> target,
        Map<String, Object> metadata,
        Instant createdAt
) {
    public static SystemLogResponse fromEntity(SystemLog log) {
        return new SystemLogResponse(
                log.getId(),
                log.getActor() != null ? log.getActor().getId() : null,
                log.getActor() != null ? log.getActor().getFullName() : null,
                log.getActor() != null ? log.getActor().getEmail() : null,
                log.getCompany() != null ? log.getCompany().getId() : null,
                log.getCompany() != null ? log.getCompany().getName() : null,
                log.getAction(),
                log.getTarget(),
                log.getMetadata(),
                log.getCreatedAt()
        );
    }
}

