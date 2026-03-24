package com.recruitpro.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class VerifyOtpRequestDto {

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Code is required")
    @Size(min = 6, max = 6, message = "OTP must be 6 digits")
    @Pattern(regexp = "^\\d{6}$", message = "OTP must be numeric")
    private String code;

    @NotBlank(message = "Type is required")
    @Pattern(regexp = "^(VERIFY_ACCOUNT|RESET_PASSWORD)$", message = "Invalid OTP type")
    private String type;
}
