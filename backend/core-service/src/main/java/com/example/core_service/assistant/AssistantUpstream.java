package com.example.core_service.assistant;

import com.example.core_service.exception.ApiException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.RestClientResponseException;
import java.net.SocketTimeoutException;
import java.util.concurrent.TimeUnit;

@Slf4j
final class AssistantUpstream {
    private AssistantUpstream() {}

    static ApiException failure(String service, long start, Exception error, String message) {
        Throwable cause = error;
        while (cause.getCause() != null && cause.getCause() != cause) cause = cause.getCause();
        int status = error instanceof RestClientResponseException http ? http.getStatusCode().value() : 0;
        log.warn("Assistant service={} elapsedMs={} errorType={} upstreamStatus={}", service,
                TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start), cause.getClass().getSimpleName(),
                status == 0 ? "unavailable" : status);
        if (status == 429 || status == 503)
            return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, service + (status == 429
                    ? " đã đạt hạn mức. Bạn vẫn có thể tìm trực tiếp theo tên hoặc mã hàng."
                    : " đang bận. Bạn vẫn có thể tìm trực tiếp theo tên hoặc mã hàng."));
        if (cause instanceof SocketTimeoutException || status == 504)
            return new ApiException(HttpStatus.GATEWAY_TIMEOUT, service + " phản hồi quá lâu. Vui lòng thử lại.");
        return new ApiException(HttpStatus.BAD_GATEWAY, message);
    }
}
