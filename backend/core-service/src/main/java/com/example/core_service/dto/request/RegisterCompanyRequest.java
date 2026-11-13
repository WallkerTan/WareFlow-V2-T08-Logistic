package com.example.core_service.dto.request;

import com.example.core_service.entity.enums.CompanyBusinessModel;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterCompanyRequest {

    @NotBlank(message = "Tên công ty không được để trống")
    @Size(max = 255, message = "Tên công ty tối đa 255 ký tự")
    private String companyName;

    @Size(max=20)
    @jakarta.validation.constraints.Pattern(regexp="^$|[0-9]{10}(-?[0-9]{3})?", message="Mã số thuế phải gồm 10 hoặc 13 chữ số")
    private String taxCode;

    private CompanyBusinessModel businessModel;
    @Size(max=2000)
    private String businessDescription;

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

    @Size(max = 50, message = "Số điện thoại tối đa 50 ký tự")
    private String phone;

    @Size(max = 500, message = "Địa chỉ tối đa 500 ký tự")
    private String address;
}
