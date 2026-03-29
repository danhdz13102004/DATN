package com.recruitpro.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserInfoResponseDto {

    private String userId;
    private String email;
    private String fullName;
    private String role;
    private String companyId;
    private String companyRole;
    private String companyName;
}
