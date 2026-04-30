package com.recruitpro.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromAddress;

    /**
     * Send OTP code via email. Per authentication.md, OTP MUST be sent
     * exclusively via email — MUST NOT be included in any API response.
     */
    @Async
    public void sendOtp(String to, String code, String purpose) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
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

    /**
     * Notify a job seeker that an interview has been scheduled for their application.
     *
     * @param to            candidate email address
     * @param candidateName candidate full name (falls back to email if null)
     * @param companyName   name of the hiring company
     * @param jobTitle      title of the job they applied for
     * @param scheduledTime interview date/time as an Instant
     * @param meetingType   e.g. "ONLINE" or "OFFLINE"
     * @param location      meeting link (online) or physical address (offline); may be null
     */
    @Async
    public void sendInterviewScheduled(
            String to,
            String candidateName,
            String companyName,
            String jobTitle,
            java.time.Instant scheduledTime,
            String meetingType,
            String location
    ) {
        try {
            String displayName = (candidateName != null && !candidateName.isBlank()) ? candidateName : to;

            DateTimeFormatter fmt = DateTimeFormatter
                    .ofPattern("EEEE, MMMM d, yyyy 'at' h:mm a z")
                    .withZone(ZoneId.of("Asia/Ho_Chi_Minh"));
            String formattedTime = fmt.format(scheduledTime);

            String locationLine;
            if (location != null && !location.isBlank()) {
                locationLine = "ONLINE".equalsIgnoreCase(meetingType)
                        ? "Meeting link : " + location
                        : "Location      : " + location;
            } else {
                locationLine = "ONLINE".equalsIgnoreCase(meetingType)
                        ? "Format        : Online (link will be shared separately)"
                        : "Format        : In-person (details will be shared separately)";
            }

            String body = String.format(
                "Dear %s,%n%n" +
                "We are pleased to invite you to an interview for the position below.%n%n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%n" +
                "Company       : %s%n" +
                "Position      : %s%n" +
                "Date & Time   : %s%n" +
                "%s%n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%n%n" +
                "Please make sure to be available at the scheduled time. " +
                "If you have any questions or need to reschedule, please reply to this email.%n%n" +
                "Best regards,%n" +
                "%s Recruitment Team%n" +
                "via RecruitPro",
                displayName,
                companyName,
                jobTitle,
                formattedTime,
                locationLine,
                companyName
            );

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(to);
            message.setSubject(String.format("Interview Invitation — %s at %s", jobTitle, companyName));
            message.setText(body);

            mailSender.send(message);
            log.info("Interview invitation email sent to {} for job '{}' at '{}'", to, jobTitle, companyName);
        } catch (Exception e) {
            log.error("Failed to send interview invitation email to {}: {}", to, e.getMessage());
        }
    }
}
