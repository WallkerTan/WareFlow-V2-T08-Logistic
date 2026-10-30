package com.example.core_service.dto.request;

import com.example.core_service.entity.enums.ProfileType;
import com.example.core_service.entity.enums.UserRole;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Request tạo tài khoản WAREHOUSE_MANAGER kèm hồ sơ công ty hoặc cá nhân.
 * <p>
 * - {@code profileType=COMPANY}    -> bắt buộc có {@code companyProfile}, {@code individualProfile} phải rỗng.
 * - {@code profileType=INDIVIDUAL} -> bắt buộc có {@code individualProfile}, {@code companyProfile} phải rỗng.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterWarehouseManagerRequest {

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không hợp lệ")
    @Size(max = 255, message = "Email tối đa 255 ký tự")
    private String email;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 8, max = 100, message = "Mật khẩu tối thiểu 8 ký tự, tối đa 100 ký tự")
    private String password;

    @NotBlank(message = "Họ tên không được để trống")
    @Size(max = 255, message = "Họ tên tối đa 255 ký tự")
    private String fullName;

    /**
     * Loại hồ sơ đi kèm. Không gửi thì mặc định là hồ sơ cá nhân.
     */
    private ProfileType profileType;

    /**
     * Role của tài khoản. Chỉ chấp nhận {@link UserRole#WAREHOUSE_MANAGER},
     * bỏ trống thì mặc định là {@link UserRole#WAREHOUSE_MANAGER}.
     */
    private UserRole role;

    @Valid
    private CompanyProfileRequest companyProfile;

    @Valid
    private IndividualProfileRequest individualProfile;
}
