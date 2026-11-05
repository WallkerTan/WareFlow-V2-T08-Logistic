package com.example.core_service.log;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation đánh dấu các API / phương thức cần ghi nhật ký kiểm toán hệ thống.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface AuditLog {

    /**
     * Tên hành động (vd: LOGIN, REGISTER_COMPANY, LOCK_COMPANY, UPLOAD_IMAGE, ...)
     */
    String action();

    /**
     * Mô tả chi tiết hành động
     */
    String description() default "";

    /**
     * Tên loại đối tượng bị tác động (vd: Company, User, Warehouse, ...)
     */
    String targetType() default "";
}

