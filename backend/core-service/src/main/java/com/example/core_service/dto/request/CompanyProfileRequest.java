package com.example.core_service.dto.request;

import com.example.core_service.entity.enums.CompanyBusinessModel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Hồ sơ công ty đi kèm khi đăng ký tài khoản WAREHOUSE_MANAGER.
 * <p>
 * Cấu trúc bám theo {@link RegisterCompanyRequest} (tên công ty + mô hình kinh doanh),
 * bổ sung mã số thuế theo hợp đồng của frontend.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyProfileRequest {

    @NotBlank(message = "Tên công ty không được để trống")
    @Size(max = 255, message = "Tên công ty tối đa 255 ký tự")
    private String companyName;

    @NotNull(message = "Mô hình kinh doanh không được để trống")
    private CompanyBusinessModel businessModel;

    @Pattern(regexp = "^$|^\\d{10}(-?\\d{3})?$", message = "Mã số thuế gồm 10 hoặc 13 chữ số")
    @Size(max = 50, message = "Mã số thuế tối đa 50 ký tự")
    private String taxCode;

    @Size(max = 50, message = "Số điện thoại tối đa 50 ký tự")
    private String phone;

    @Size(max = 500, message = "Địa chỉ tối đa 500 ký tự")
    private String address;
}
