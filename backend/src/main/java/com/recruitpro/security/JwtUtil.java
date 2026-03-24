package com.recruitpro.security;

import com.recruitpro.model.Staff;
import com.recruitpro.model.User;
import com.recruitpro.model.enums.UserRole;
import com.recruitpro.repository.StaffRepository;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtUtil {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.access-expiration-ms}")
    private long accessExpirationMs;

    @Value("${app.jwt.refresh-expiration-ms}")
    private long refreshExpirationMs;

    private final StaffRepository staffRepository;

    private SecretKey key;

    @PostConstruct
    public void init() {
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        this.key = Keys.hmacShaKeyFor(keyBytes);
    }

    /**
     * Generate access token with user claims.
     * Per authentication.md: sub, email, role, iat, exp, iss.
     * For COMPANY users: adds companyId and companyRole.
     */
    public String generateAccessToken(User user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("email", user.getEmail());
        claims.put("role", user.getRole().name());

        // Add company claims for COMPANY users
        if (user.getRole() == UserRole.COMPANY) {
            staffRepository.findByUserId(user.getId()).ifPresent(staff -> {
                claims.put("companyId", staff.getCompanyId().toString());
                claims.put("companyRole", staff.getRole().name());
            });
        }

        return buildToken(user.getId().toString(), claims, accessExpirationMs);
    }

    /**
     * Generate refresh token (minimal claims).
     */
    public String generateRefreshToken(User user) {
        return buildToken(user.getId().toString(), Collections.emptyMap(), refreshExpirationMs);
    }

    private String buildToken(String subject, Map<String, Object> claims, long expirationMs) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .claims(claims)
                .subject(subject)
                .issuer("recruitpro-backend")
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    /**
     * Extract all claims from a valid token.
     * Returns empty if token is expired, malformed, or tampered.
     */
    public Optional<Claims> parseToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .requireIssuer("recruitpro-backend")
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return Optional.of(claims);
        } catch (ExpiredJwtException ex) {
            log.debug("JWT expired: {}", ex.getMessage());
        } catch (JwtException ex) {
            log.warn("Invalid JWT: {}", ex.getMessage());
        }
        return Optional.empty();
    }

    public String getSubject(Claims claims) {
        return claims.getSubject();
    }

    public String getRole(Claims claims) {
        return claims.get("role", String.class);
    }

    public String getEmail(Claims claims) {
        return claims.get("email", String.class);
    }

    public String getCompanyId(Claims claims) {
        return claims.get("companyId", String.class);
    }

    public String getCompanyRole(Claims claims) {
        return claims.get("companyRole", String.class);
    }
}
