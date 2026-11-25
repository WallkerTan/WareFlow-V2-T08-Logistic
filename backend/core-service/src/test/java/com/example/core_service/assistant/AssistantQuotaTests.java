package com.example.core_service.assistant;

import com.example.core_service.entity.User;
import com.example.core_service.entity.enums.UserRole;
import com.example.core_service.exception.ApiException;
import com.example.core_service.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import java.util.stream.IntStream;

import static com.example.core_service.assistant.AssistantQuota.Kind.CONVERSATION;
import static com.example.core_service.assistant.AssistantQuota.Kind.OPERATION;
import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@ActiveProfiles("test")
class AssistantQuotaTests {
    @Autowired AssistantQuota quota;
    @Autowired AssistantDailyUsageRepository usage;
    @Autowired UserRepository users;

    @Test
    void concurrentRequestsShareOneOperationLimitAndConversationsHaveTheirOwnLimit() throws Exception {
        UUID user = createUser();
        try (var workers = Executors.newFixedThreadPool(5)) {
            var requests = IntStream.range(0, 15).mapToObj(i -> (Callable<Boolean>) () -> {
                try {
                    quota.consume(user, OPERATION);
                    return true;
                } catch (ApiException ex) {
                    assertThat(ex.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
                    return false;
                }
            }).toList();
            int accepted = 0;
            for (var result : workers.invokeAll(requests)) {
                if (result.get()) accepted++;
            }
            assertThat(accepted).isEqualTo(10);
        }
        for (int i = 0; i < 20; i++) quota.consume(user, CONVERSATION);
        assertThat(assertThrows(ApiException.class, () -> quota.consume(user, CONVERSATION)).getStatus())
                .isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(assertThrows(ApiException.class, () -> quota.requireAvailable(user)).getStatus())
                .isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        quota.consume(createUser(), OPERATION);
    }

    @Test
    void usageFromYesterdayIsResetForBothCategories() {
        UUID user = createUser();
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        var yesterday = new AssistantDailyUsage(user, today.minusDays(1));
        for (int i = 0; i < 10; i++) yesterday.increment(OPERATION);
        for (int i = 0; i < 20; i++) yesterday.increment(CONVERSATION);
        usage.saveAndFlush(yesterday);
        quota.requireAvailable(user);
        quota.consume(user, OPERATION);
        quota.consume(user, CONVERSATION);
        var current = usage.findById(user).orElseThrow();
        assertThat(current.used(OPERATION, today)).isEqualTo(1);
        assertThat(current.used(CONVERSATION, today)).isEqualTo(1);
    }

    private UUID createUser() {
        return users.save(User.builder().role(UserRole.WAREHOUSE_MANAGER)
                .email(UUID.randomUUID() + "@example.test").passwordHash("test-only").build()).getId();
    }
}
