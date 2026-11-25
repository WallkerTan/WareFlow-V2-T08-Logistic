package com.example.core_service.assistant;

import com.example.core_service.exception.ApiException;
import com.example.core_service.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;

@Service
@RequiredArgsConstructor
class AssistantQuota {
    enum Kind { OPERATION, CONVERSATION }

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final int OPERATIONS = 10;
    private static final int CONVERSATIONS = 20;

    private final UserRepository users;
    private final AssistantDailyUsageRepository usage;

    @Transactional(readOnly = true)
    public void requireAvailable(UUID userId) {
        var row = usage.findById(userId).orElse(null);
        var today = LocalDate.now(ZONE);
        if (row != null && row.used(Kind.OPERATION, today) >= OPERATIONS
                && row.used(Kind.CONVERSATION, today) >= CONVERSATIONS) {
            throw limitReached("Bạn đã dùng hết lượt trợ lý hôm nay.");
        }
    }

    @Transactional
    public void consume(UUID userId, Kind kind) {
        // Lock the account so the first use and simultaneous requests share one counter.
        users.lockById(userId).orElseThrow(() -> ApiException.unauthorized("Tài khoản không còn hiệu lực."));
        var today = LocalDate.now(ZONE);
        var existing = usage.findById(userId);
        var row = existing.orElseGet(() -> new AssistantDailyUsage(userId, today));
        row.reset(today);
        if (kind == Kind.OPERATION && row.used(kind, today) >= OPERATIONS) {
            throw limitReached("Bạn đã dùng hết 10 lượt yêu cầu nghiệp vụ hôm nay.");
        }
        if (kind == Kind.CONVERSATION && row.used(kind, today) >= CONVERSATIONS) {
            throw limitReached("Bạn đã dùng hết 20 lượt hỏi đáp hôm nay.");
        }
        row.increment(kind);
        if (existing.isEmpty()) usage.save(row);
    }

    private ApiException limitReached(String message) {
        return new ApiException(HttpStatus.TOO_MANY_REQUESTS, message + " Lượt mới có từ 00:00 giờ Việt Nam.");
    }
}
