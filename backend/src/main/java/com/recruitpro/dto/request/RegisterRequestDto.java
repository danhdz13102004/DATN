package com.recruitpro.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class RegisterRequestDto {

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    @NotBlank(message = "Role is required")
    @Pattern(regexp = "^(JOBSEEKER|COMPANY)$", message = "Role must be JOBSEEKER or COMPANY")
    private String role;

    // Company-only fields (optional for JOBSEEKER)
    private String companyName;
}
