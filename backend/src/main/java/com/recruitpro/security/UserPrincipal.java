package com.recruitpro.security;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

/**
 * Represents the authenticated user principal extracted from the JWT.
 * Stored in SecurityContext for downstream access.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class UserPrincipal {

    private String id;
    private String email;
    private String role;
    private String companyId;    // null if not COMPANY role
    private String companyRole;  // null if not COMPANY role
}
