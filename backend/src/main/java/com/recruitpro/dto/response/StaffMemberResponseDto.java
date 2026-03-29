package com.recruitpro.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffMemberResponseDto {

    private String id;
    private String userId;
    private String email;
    private String fullName;
    private String role;
    private Instant joinedAt;
}
