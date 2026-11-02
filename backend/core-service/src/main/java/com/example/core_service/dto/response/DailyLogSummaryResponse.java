package com.example.core_service.dto.response;

import java.time.LocalDate;

public record DailyLogSummaryResponse(
        LocalDate date,
        Long totalLogs
) {}

