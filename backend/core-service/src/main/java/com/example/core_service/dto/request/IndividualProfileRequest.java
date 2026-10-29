package com.example.core_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Hồ sơ cá nhân đi kèm khi đăng ký tài khoản WAREHOUSE_MANAGER.
 * <p>
 * Lưu vào {@code users.profile} (jsonb). Họ tên nằm ở {@code fullName} của tài khoản.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IndividualProfileRequest {

    @NotBlank(message = "Số điện thoại không được để trống")
    @Size(max = 50, message = "Số điện thoại tối đa 50 ký tự")
    private String phone;

    @Size(max = 500, message = "Địa chỉ tối đa 500 ký tự")
    private String address;

    @Size(max = 50, message = "Số định danh tối đa 50 ký tự")
    private String idNumber;

    @Size(max = 20, message = "Ngày sinh tối đa 20 ký tự")
    private String dateOfBirth;
}
