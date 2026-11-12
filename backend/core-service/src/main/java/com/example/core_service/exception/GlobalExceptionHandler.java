package com.example.core_service.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.exc.MismatchedInputException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Global error handler - trả về body JSON thống nhất cho mọi lỗi.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<Map<String,Object>> denied(Exception ex) {
        return ResponseEntity.status(403).body(buildBody(HttpStatus.FORBIDDEN,"Không có quyền truy cập",null));
    }
    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    public ResponseEntity<Map<String,Object>> status(org.springframework.web.server.ResponseStatusException ex) {
        var status=HttpStatus.valueOf(ex.getStatusCode().value());
        return ResponseEntity.status(status).body(buildBody(status,ex.getReason(),null));
    }
    @ExceptionHandler({org.springframework.dao.DataIntegrityViolationException.class,org.springframework.dao.OptimisticLockingFailureException.class})
    public ResponseEntity<Map<String,Object>> conflict(Exception ex) {
        return ResponseEntity.status(409).body(buildBody(HttpStatus.CONFLICT,"Dữ liệu trùng hoặc đã thay đổi, vui lòng tải lại",null));
    }
    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String,Object>> oversized(Exception ex) {
        return ResponseEntity.status(413).body(buildBody(HttpStatus.CONTENT_TOO_LARGE,"Ảnh vượt quá giới hạn 10MB",null));
    }
    @ExceptionHandler({org.springframework.web.bind.MissingServletRequestParameterException.class,org.springframework.web.multipart.support.MissingServletRequestPartException.class})
    public ResponseEntity<Map<String,Object>> missing(Exception ex) {
        return ResponseEntity.badRequest().body(buildBody(HttpStatus.BAD_REQUEST,"Thiếu tham số bắt buộc",null));
    }

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, Object>> handleApiException(ApiException ex) {
        return ResponseEntity.status(ex.getStatus())
                .body(buildBody(ex.getStatus(), ex.getMessage(), null));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationException(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.putIfAbsent(fieldError.getField(), fieldError.getDefaultMessage());
        }

        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(fieldError -> fieldError.getField() + ": " + fieldError.getDefaultMessage())
                .collect(Collectors.joining(", "));

        return ResponseEntity.badRequest()
                .body(buildBody(HttpStatus.BAD_REQUEST,
                        message.isBlank() ? "Dữ liệu không hợp lệ" : message,
                        fieldErrors));
    }

    /**
     * Body JSON không hợp lệ (sai cú pháp, sai kiểu field) -> 400 thay vì 500.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleUnreadableMessage(HttpMessageNotReadableException ex) {
        String message = "Body request không hợp lệ";

        Throwable cause = ex.getCause();
        if (cause instanceof MismatchedInputException mismatched) {
            String path = extractPath(mismatched);
            if (path != null && !path.isBlank()) {
                message = path + ": giá trị không đúng kiểu hoặc không hợp lệ";
            }
        } else if (cause instanceof JacksonException jacksonException) {
            String path = extractPath(jacksonException);
            if (path != null && !path.isBlank()) {
                message = path + ": dữ liệu không hợp lệ";
            }
        }

        return ResponseEntity.badRequest()
                .body(buildBody(HttpStatus.BAD_REQUEST, message, null));
    }

    private String extractPath(JacksonException exception) {
        List<JacksonException.Reference> path = exception.getPath();
        if (path == null || path.isEmpty()) {
            return null;
        }
        return path.stream()
                .map(reference -> reference.getPropertyName() != null ? reference.getPropertyName() : reference.toString())
                .reduce((a, b) -> a + "." + b)
                .orElse(null);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String message = ex.getName() + ": giá trị không hợp lệ";
        return ResponseEntity.badRequest()
                .body(buildBody(HttpStatus.BAD_REQUEST, message, null));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNoResource(NoResourceFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(buildBody(HttpStatus.NOT_FOUND, "Không tìm thấy endpoint: " + ex.getResourcePath(), null));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnexpectedException(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(buildBody(HttpStatus.INTERNAL_SERVER_ERROR, "Đã xảy ra lỗi hệ thống, vui lòng thử lại", null));
    }

    private Map<String, Object> buildBody(HttpStatus status, String message, Object errors) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);
        if (errors != null) {
            body.put("errors", errors);
        }
        return body;
    }
}
