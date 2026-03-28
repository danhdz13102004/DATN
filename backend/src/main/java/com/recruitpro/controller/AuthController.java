package com.recruitpro.controller;

import com.recruitpro.dto.request.*;
import com.recruitpro.dto.response.ApiResponse;
import com.recruitpro.dto.response.AuthResponseDto;
import com.recruitpro.dto.response.UserInfoResponseDto;
import com.recruitpro.security.UserPrincipal;
import com.recruitpro.service.AuthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Map<String, String>>> register(
            @RequestBody @Valid RegisterRequestDto request
    ) {
        authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(Map.of("message", "Registration successful. Please check your email for OTP.")));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponseDto>> login(
            @RequestBody @Valid LoginRequestDto request
    ) {
        AuthResponseDto response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponseDto>> refresh(
            @RequestBody @Valid RefreshTokenRequestDto request
    ) {
        AuthResponseDto response = authService.refresh(request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Map<String, String>>> logout(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        authService.logout(principal);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "Logged out successfully")));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse<Map<String, String>>> verifyOtp(
            @RequestBody @Valid VerifyOtpRequestDto request
    ) {
        authService.verifyOtp(request);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "OTP verified successfully")));
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<ApiResponse<Map<String, String>>> resendOtp(
            @RequestBody Map<String, String> body
    ) {
        authService.resendOtp(body.get("email"));
        return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "OTP sent successfully")));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Map<String, String>>> forgotPassword(
            @RequestParam @Email String email
    ) {
        authService.forgotPassword(email);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "If an account exists with this email, a reset code has been sent.")));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Map<String, String>>> resetPassword(
            @RequestBody @Valid ResetPasswordRequestDto request
    ) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "Password reset successfully")));
    }

    @PutMapping("/change-password")
    public ResponseEntity<ApiResponse<Map<String, String>>> changePassword(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody @Valid ChangePasswordRequestDto request
    ) {
        authService.changePassword(principal, request);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "Password changed successfully")));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserInfoResponseDto>> getCurrentUser(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserInfoResponseDto userInfo = authService.getCurrentUser(principal);
        return ResponseEntity.ok(ApiResponse.ok(userInfo));
    }
}
