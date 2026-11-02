package com.example.core_service.entity.enums;

/**
 * Loại hồ sơ đi kèm khi tạo tài khoản.
 * <p>
 * COMPANY    : tài khoản đi kèm hồ sơ công ty (tạo mới một {@code Company}).
 * INDIVIDUAL : tài khoản đi kèm hồ sơ cá nhân (không có công ty).
 */
public enum ProfileType {
    COMPANY,
    INDIVIDUAL
}
