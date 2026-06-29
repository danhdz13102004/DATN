package com.recruitpro.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class ResetPasswordRequestDto {

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Code is required")
    @Size(min = 6, max = 6)
    private String code;

    @NotBlank(message = "New password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String newPassword;
}
