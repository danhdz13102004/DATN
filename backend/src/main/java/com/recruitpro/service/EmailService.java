package com.recruitpro.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    /**
     * Send OTP code via email. Per authentication.md, OTP MUST be sent
     * exclusively via email — MUST NOT be included in any API response.
     */
    @Async
    public void sendOtp(String to, String code, String purpose) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject("RecruitPro — Your verification code");
            message.setText(String.format(
                "Your %s code is: %s\n\nThis code expires in 5 minutes.\n\nIf you did not request this, please ignore this email.",
                purpose, code
            ));

            mailSender.send(message);
            log.info("OTP email sent to {}", to);
        } catch (Exception e) {
            log.error("Failed to send OTP email to {}: {}", to, e.getMessage());
        }
    }
}
