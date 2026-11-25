package com.example.core_service.assistant;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

import java.time.LocalDate;
import java.util.UUID;

@Entity
class AssistantDailyUsage {
    @Id
    private UUID userId;
    private LocalDate usageDate;
    private int operations;
    private int conversations;

    protected AssistantDailyUsage() {}

    AssistantDailyUsage(UUID userId, LocalDate date) {
        this.userId = userId;
        reset(date);
    }

    void reset(LocalDate date) {
        if (date.equals(usageDate)) return;
        usageDate = date;
        operations = 0;
        conversations = 0;
    }

    int used(AssistantQuota.Kind kind, LocalDate date) {
        if (!date.equals(usageDate)) return 0;
        return kind == AssistantQuota.Kind.OPERATION ? operations : conversations;
    }

    void increment(AssistantQuota.Kind kind) {
        switch (kind) {
            case OPERATION -> operations++;
            case CONVERSATION -> conversations++;
        }
    }
}
