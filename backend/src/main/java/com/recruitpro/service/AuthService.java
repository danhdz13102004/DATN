package com.recruitpro.service;

import com.recruitpro.dto.request.*;
import com.recruitpro.dto.response.AuthResponseDto;
import com.recruitpro.dto.response.UserInfoResponseDto;
import com.recruitpro.exception.DuplicateResourceException;
import com.recruitpro.exception.RateLimitException;
import com.recruitpro.exception.ResourceNotFoundException;
import com.recruitpro.exception.UnauthorizedException;
import com.recruitpro.model.Company;
import com.recruitpro.model.JobSeeker;
import com.recruitpro.model.Otp;
import com.recruitpro.model.Staff;
import com.recruitpro.model.User;
import com.recruitpro.model.enums.*;
import com.recruitpro.cache.CacheService;
import com.recruitpro.repository.CompanyRepository;
import com.recruitpro.repository.JobSeekerRepository;
import com.recruitpro.repository.OtpRepository;
import com.recruitpro.repository.StaffRepository;
import com.recruitpro.repository.UserRepository;
import com.recruitpro.security.JwtUtil;
import com.recruitpro.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final StaffRepository staffRepository;
    private final OtpRepository otpRepository;
    private final CompanyRepository companyRepository;
    private final JobSeekerRepository jobSeekerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;
    private final CacheService cacheService;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String REFRESH_TOKEN_PREFIX = "refresh_token:";
    private static final long REFRESH_TOKEN_TTL_DAYS = 7;

    // ── Register ──────────────────────────────────

    @Transactional
    public void register(RegisterRequestDto request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email already registered");
        }

        UserRole role = UserRole.valueOf(request.getRole());

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .role(role)
                .status(UserStatus.PENDING_VERIFICATION)
                .build();
        userRepository.save(user);

        // If COMPANY role, create company and staff (owner) records
        if (role == UserRole.COMPANY) {
            String companyName = (request.getCompanyName() != null && !request.getCompanyName().isBlank())
                    ? request.getCompanyName()
                    : request.getEmail(); // fallback to email if no name provided

            Company company = Company.builder()
                    .name(companyName)
                    .verified(false)
                    .build();
            companyRepository.save(company);

            Staff staff = Staff.builder()
                    .user(user)
                    .companyId(company.getId())
                    .role(CompanyUserRole.OWNER)
                    .build();
            staffRepository.save(staff);

            log.info("Company '{}' created for user: {}", companyName, user.getEmail());
        }

        // If JOBSEEKER role, create job_seekers profile record
        if (role == UserRole.JOBSEEKER) {
            JobSeeker jobSeeker = JobSeeker.builder()
                    .user(user)
                    .build();
            jobSeekerRepository.save(jobSeeker);
            log.info("Job seeker profile created for user: {}", user.getEmail());
        }

        // Generate and send verification OTP
        sendOtpInternal(user.getEmail(), OtpType.VERIFY_ACCOUNT);

        log.info("User registered: {} ({})", user.getEmail(), role);
    }

    // ── Login ─────────────────────────────────────

    @Transactional
    public AuthResponseDto login(LoginRequestDto request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email or password");
        }

        if (user.getStatus() == UserStatus.SUSPENDED) {
            throw new UnauthorizedException("Account is suspended");
        }

        if (user.getStatus() == UserStatus.PENDING_VERIFICATION) {
            throw new UnauthorizedException("Account not verified. Please check your email for the OTP.");
        }

        // Backfill: ensure JOBSEEKER profile exists for legacy accounts
        if (user.getRole() == UserRole.JOBSEEKER) {
            if (jobSeekerRepository.findByUserId(user.getId()).isEmpty()) {
                JobSeeker jobSeeker = JobSeeker.builder()
                        .user(user)
                        .build();
                jobSeekerRepository.save(jobSeeker);
                log.info("Backfilled job seeker profile on login for user: {}", user.getEmail());
            }
        }

        return generateTokenResponse(user);
    }

    // ── Refresh Token ─────────────────────────────

    public AuthResponseDto refresh(RefreshTokenRequestDto request) {
        // Validate refresh token signature
        var claimsOpt = jwtUtil.parseToken(request.getRefreshToken());
        if (claimsOpt.isEmpty()) {
            throw new UnauthorizedException("Invalid or expired refresh token");
        }

        String userId = claimsOpt.get().getSubject();
        String redisKey = REFRESH_TOKEN_PREFIX + userId;

        // Verify token matches stored version (detect rotation reuse)
        var storedToken = cacheService.get(redisKey);
        if (storedToken.isEmpty() || !storedToken.get().equals(request.getRefreshToken())) {
            // Potential token theft — revoke all tokens for user
            cacheService.delete(redisKey);
            throw new UnauthorizedException("Refresh token reuse detected. Please login again.");
        }

        User user = userRepository.findById(UUID.fromString(userId))
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        // Rotate: issue new tokens
        return generateTokenResponse(user);
    }

    // ── Logout ────────────────────────────────────

    public void logout(UserPrincipal principal) {
        String redisKey = REFRESH_TOKEN_PREFIX + principal.getId();
        cacheService.delete(redisKey);
        log.info("User logged out: {}", principal.getEmail());
    }

    // ── Verify OTP ────────────────────────────────

    @Transactional
    public void verifyOtp(VerifyOtpRequestDto request) {
        OtpType type = OtpType.valueOf(request.getType());
        Otp otp = otpRepository
                .findTopByEmailAndTypeAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
                        request.getEmail(), type, Instant.now()
                )
                .orElseThrow(() -> new UnauthorizedException("Invalid or expired OTP"));

        if (otp.getAttempts() >= 5) {
            throw new UnauthorizedException("OTP verification attempts exceeded. Please request a new code.");
        }

        if (!otp.getCode().equals(request.getCode())) {
            otp.setAttempts(otp.getAttempts() + 1);
            otpRepository.save(otp);
            throw new UnauthorizedException("Incorrect OTP code");
        }

        // Mark OTP as used
        otp.setUsed(true);
        otpRepository.save(otp);

        // If verifying account, activate user and verify company (if applicable)
        if (type == OtpType.VERIFY_ACCOUNT) {
            User user = userRepository.findByEmail(request.getEmail())
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            user.setStatus(UserStatus.ACTIVE);
            user.setEmailVerifiedAt(Instant.now());
            userRepository.save(user);

            // If user is a COMPANY owner, also verify the company
            if (user.getRole() == UserRole.COMPANY) {
                staffRepository.findByUserId(user.getId()).ifPresent(staff -> {
                    companyRepository.findById(staff.getCompanyId()).ifPresent(company -> {
                        company.setVerified(true);
                        companyRepository.save(company);
                        log.info("Company '{}' verified for user: {}", company.getName(), request.getEmail());
                    });
                });
            }

            // Safety net: ensure JOBSEEKER profile exists (backfill for legacy accounts)
            if (user.getRole() == UserRole.JOBSEEKER) {
                if (jobSeekerRepository.findByUserId(user.getId()).isEmpty()) {
                    JobSeeker jobSeeker = JobSeeker.builder()
                            .user(user)
                            .build();
                    jobSeekerRepository.save(jobSeeker);
                    log.info("Backfilled job seeker profile for user: {}", user.getEmail());
                }
            }

            log.info("User verified: {}", request.getEmail());
        }
    }

    // ── Resend OTP ────────────────────────────────

    public void resendOtp(String email) {
        // Rate limit: 1 per 60 seconds
        if (otpRepository.existsByEmailAndCreatedAtAfter(email, Instant.now().minus(Duration.ofSeconds(60)))) {
            throw new RateLimitException("Please wait 60 seconds before requesting a new OTP");
        }

        userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("No account found with this email"));

        sendOtpInternal(email, OtpType.VERIFY_ACCOUNT);
    }

    // ── Forgot Password ───────────────────────────

    public void forgotPassword(String email) {
        // Rate limit: 1 per 60 seconds
        if (otpRepository.existsByEmailAndCreatedAtAfter(email, Instant.now().minus(Duration.ofSeconds(60)))) {
            throw new RateLimitException("Please wait 60 seconds before requesting a new OTP");
        }

        // Always respond 200 to prevent email enumeration
        userRepository.findByEmail(email).ifPresent(user ->
            sendOtpInternal(email, OtpType.RESET_PASSWORD)
        );
    }

    // ── Reset Password ────────────────────────────

    @Transactional
    public void resetPassword(ResetPasswordRequestDto request) {
        // First verify the OTP
        VerifyOtpRequestDto verifyRequest = new VerifyOtpRequestDto();
        verifyRequest.setEmail(request.getEmail());
        verifyRequest.setCode(request.getCode());
        verifyRequest.setType(OtpType.RESET_PASSWORD.name());
        verifyOtp(verifyRequest);

        // Update password
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // Revoke all refresh tokens
        cacheService.delete(REFRESH_TOKEN_PREFIX + user.getId().toString());

        log.info("Password reset for: {}", request.getEmail());
    }

    // ── Change Password ───────────────────────────

    @Transactional
    public void changePassword(UserPrincipal principal, ChangePasswordRequestDto request) {
        User user = userRepository.findById(UUID.fromString(principal.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Current password is incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // Revoke all refresh tokens per authentication.md
        cacheService.delete(REFRESH_TOKEN_PREFIX + principal.getId());

        log.info("Password changed for: {}", principal.getEmail());
    }

    // ── Get Current User ─────────────────────────

    public UserInfoResponseDto getCurrentUser(UserPrincipal principal) {
        User user = userRepository.findById(UUID.fromString(principal.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
                
        UserInfoResponseDto.UserInfoResponseDtoBuilder builder = UserInfoResponseDto.builder()
                .userId(principal.getId())
                .email(principal.getEmail())
                .fullName(user.getFullName())
                .role(principal.getRole());

        if (principal.getCompanyId() != null) {
            builder.companyId(principal.getCompanyId());
            builder.companyRole(principal.getCompanyRole());
            companyRepository.findById(UUID.fromString(principal.getCompanyId()))
                    .ifPresent(company -> builder.companyName(company.getName()));
        }

        return builder.build();
    }

    // ── Internal helpers ──────────────────────────

    private AuthResponseDto generateTokenResponse(User user) {
        String accessToken = jwtUtil.generateAccessToken(user);
        String refreshToken = jwtUtil.generateRefreshToken(user);

        // Store refresh token in Redis via CacheService with TTL for rotation detection
        String redisKey = REFRESH_TOKEN_PREFIX + user.getId().toString();
        cacheService.set(redisKey, refreshToken, REFRESH_TOKEN_TTL_DAYS, TimeUnit.DAYS);

        AuthResponseDto.AuthResponseDtoBuilder builder = AuthResponseDto.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .userId(user.getId().toString())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name());

        // Add company context for COMPANY users
        if (user.getRole() == UserRole.COMPANY) {
            staffRepository.findByUserId(user.getId()).ifPresent(staff -> {
                builder.companyId(staff.getCompanyId().toString());
                builder.companyRole(staff.getRole().name());
            });
        }

        return builder.build();
    }

    private void sendOtpInternal(String email, OtpType type) {
        String code = "111111"; // TODO: replace with random for production: String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));

        Otp otp = Otp.builder()
                .email(email)
                .code(code)
                .type(type)
                .used(false)
                .attempts(0)
                .expiresAt(Instant.now().plus(Duration.ofMinutes(5)))
                .build();
        otpRepository.save(otp);

        String purpose = type == OtpType.VERIFY_ACCOUNT ? "account verification" : "password reset";
        emailService.sendOtp(email, code, purpose);
    }
}
