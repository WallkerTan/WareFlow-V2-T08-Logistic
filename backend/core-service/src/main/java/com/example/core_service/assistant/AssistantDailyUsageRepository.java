package com.example.core_service.assistant;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

interface AssistantDailyUsageRepository extends JpaRepository<AssistantDailyUsage, UUID> {}
