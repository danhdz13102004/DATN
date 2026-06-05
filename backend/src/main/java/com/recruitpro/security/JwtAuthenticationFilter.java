package com.recruitpro.security;

import com.recruitpro.repository.CompanyRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final CompanyRepository companyRepository;

    private static final String BEARER_PREFIX = "Bearer ";

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith(BEARER_PREFIX)) {
            String token = authHeader.substring(BEARER_PREFIX.length());
            Optional<Claims> claimsOpt = jwtUtil.parseToken(token);

            claimsOpt.ifPresent(claims -> {
                String userId = jwtUtil.getSubject(claims);
                String role = jwtUtil.getRole(claims);
                String companyId = jwtUtil.getCompanyId(claims);

                if (isBlockedCompanyPrincipal(role, companyId)) {
                    log.debug("Rejected JWT for blocked company {}", companyId);
                    return;
                }

                List<SimpleGrantedAuthority> authorities = Collections.singletonList(
                        new SimpleGrantedAuthority("ROLE_" + role)
                );

                UserPrincipal principal = UserPrincipal.builder()
                        .id(userId)
                        .email(jwtUtil.getEmail(claims))
                        .role(role)
                        .companyId(companyId)
                        .companyRole(jwtUtil.getCompanyRole(claims))
                        .build();

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(principal, null, authorities);

                SecurityContextHolder.getContext().setAuthentication(authentication);
            });
        }

        filterChain.doFilter(request, response);
    }

    private boolean isBlockedCompanyPrincipal(String role, String companyId) {
        if (!"COMPANY".equals(role) || companyId == null) {
            return false;
        }

        try {
            return companyRepository.findById(UUID.fromString(companyId))
                    .map(company -> company.isBlocked())
                    .orElse(false);
        } catch (IllegalArgumentException ex) {
            return true;
        }
    }
}
