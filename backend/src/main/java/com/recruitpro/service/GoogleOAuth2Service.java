package com.recruitpro.service;

import com.recruitpro.cache.CacheService;
import com.recruitpro.dto.request.GoogleOAuthRequestDto;
import com.recruitpro.dto.response.AuthResponseDto;
import com.recruitpro.model.JobSeeker;
import com.recruitpro.model.User;
import com.recruitpro.model.enums.UserRole;
import com.recruitpro.model.enums.UserStatus;
import com.recruitpro.repository.JobSeekerRepository;
import com.recruitpro.repository.UserRepository;
import com.recruitpro.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class GoogleOAuth2Service {

    private static final String TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";
    private static final String REFRESH_TOKEN_PREFIX = "refresh_token:";
    private static final long REFRESH_TOKEN_TTL_DAYS = 7;

    private final UserRepository userRepository;
    private final JobSeekerRepository jobSeekerRepository;
    private final RestTemplate googleRestTemplate;
    private final JwtUtil jwtUtil;
    private final CacheService cacheService;

    @Value("${app.google.oauth2.client-id:}")
    private String googleClientId;

    @Transactional
    public AuthResponseDto handleGoogleOAuth2(GoogleOAuthRequestDto request) {
        Map<String, Object> tokenInfo = validateIdToken(request.getIdToken());

        String googleId = (String) tokenInfo.get("sub");
        String email = (String) tokenInfo.get("email");
        String name = (String) tokenInfo.get("name");
        String picture = (String) tokenInfo.get("picture");

        if (email == null || googleId == null) {
            throw new IllegalArgumentException("Invalid Google ID token: missing email or subject");
        }

        User user = userRepository.findByGoogleId(googleId)
                .orElseGet(() -> {
                    Optional<User> existing = userRepository.findByEmail(email);
                    if (existing.isPresent()) {
                        User u = existing.get();
                        u.setGoogleId(googleId);
                        u.setAvatarUrl(picture);
                        log.info("Linked existing user {} to Google ID {}", email, googleId);
                        return userRepository.save(u);
                    }
                    return createNewUser(googleId, email, name, picture, request.getRole());
                });

        if (user.getStatus() == UserStatus.SUSPENDED) {
            throw new IllegalArgumentException("Account is suspended");
        }

        if (user.getRole() == UserRole.JOBSEEKER) {
            if (jobSeekerRepository.findByUserId(user.getId()).isEmpty()) {
                JobSeeker jobSeeker = JobSeeker.builder()
                        .user(user)
                        .build();
                jobSeekerRepository.save(jobSeeker);
                log.info("Backfilled job seeker profile on Google OAuth login for user: {}", user.getEmail());
            }
        }

        return generateTokenResponse(user);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> validateIdToken(String idToken) {
        try {
            Map<String, Object> response = googleRestTemplate.postForObject(
                    TOKENINFO_URL + "?id_token={idToken}", null, Map.class, idToken);

            if (response == null) {
                throw new IllegalArgumentException("Invalid Google ID token: empty response from tokeninfo");
            }

            if (googleClientId != null && !googleClientId.isBlank()) {
                String audience = (String) response.get("aud");
                if (audience == null || !audience.equals(googleClientId)) {
                    log.warn("Google token audience mismatch. Expected '{}', got '{}'", googleClientId, audience);
                    throw new IllegalArgumentException("Invalid Google ID token: audience mismatch");
                }
            }

            return response;
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Google ID token validation failed: {}", e.getMessage());
            throw new IllegalArgumentException("Invalid Google ID token");
        }
    }

    private User createNewUser(String googleId, String email, String name, String picture, String roleStr) {
        UserRole role;
        try {
            role = UserRole.valueOf(roleStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            role = UserRole.JOBSEEKER;
        }

        User user = User.builder()
                .id(UUID.randomUUID())
                .email(email)
                .passwordHash("")
                .fullName(name != null ? name : email)
                .role(role)
                .status(UserStatus.ACTIVE)
                .googleId(googleId)
                .avatarUrl(picture)
                .emailVerifiedAt(Instant.now())
                .build();

        user = userRepository.save(user);

        if (role == UserRole.JOBSEEKER) {
            JobSeeker jobSeeker = JobSeeker.builder()
                    .user(user)
                    .build();
            jobSeekerRepository.save(jobSeeker);
            log.info("Job seeker profile created via Google OAuth for user: {}", email);
        }

        log.info("New user created via Google OAuth: {} ({})", email, role);
        return user;
    }

    private AuthResponseDto generateTokenResponse(User user) {
        String accessToken = jwtUtil.generateAccessToken(user);
        String refreshToken = jwtUtil.generateRefreshToken(user);

        String redisKey = REFRESH_TOKEN_PREFIX + user.getId().toString();
        cacheService.set(redisKey, refreshToken, REFRESH_TOKEN_TTL_DAYS, TimeUnit.DAYS);

        return AuthResponseDto.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .userId(user.getId().toString())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .build();
    }
}
