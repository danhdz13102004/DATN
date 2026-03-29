package com.recruitpro.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateStaffRequestDto {

    @NotBlank(message = "Full name is required")
    private String fullName;
}
