package com.recruitpro.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GoogleOAuthRequestDto {

    @NotBlank(message = "ID token is required")
    private String idToken;

    @NotBlank(message = "Role is required")
    private String role;
}
