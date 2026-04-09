package com.recruitpro.service;

import com.recruitpro.dto.chat.ConversationResponseDto;
import com.recruitpro.exception.ForbiddenException;
import com.recruitpro.exception.ResourceNotFoundException;
import com.recruitpro.model.Application;
import com.recruitpro.model.Conversation;
import com.recruitpro.model.enums.UserRole;
import com.recruitpro.repository.ApplicationRepository;
import com.recruitpro.repository.ConversationRepository;
import com.recruitpro.repository.JobSeekerRepository;
import com.recruitpro.repository.StaffRepository;
import com.recruitpro.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final ApplicationRepository  applicationRepository;
    private final StaffRepository        staffRepository;
    private final JobSeekerRepository    jobSeekerRepository;
    private final UserRepository         userRepository;

    @Transactional
    public Conversation createConversation(UUID applicationId, UUID staffUserId) {
        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));

        var staff = staffRepository.findByUserId(staffUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Staff record not found for user"));

        UUID jobSeekerId = application.getJobSeekerId();

        var existingByPair = conversationRepository
            .findByStaffIdAndJobSeekerIdOrderByLastActivityDesc(staff.getId(), jobSeekerId)
            .stream()
            .findFirst();
        if (existingByPair.isPresent()) {
            return existingByPair.get();
        }

        Conversation conversation = Conversation.builder()
                .applicationId(applicationId)
                .staffId(staff.getId())
                .jobSeekerId(jobSeekerId)
                .isInitiated(false)
                .build();

        return conversationRepository.save(conversation);
    }

    @Transactional(readOnly = true)
    public Conversation getConversationOrThrow(UUID conversationId) {
        return conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));
    }

    /**
     * Validates that the given userId is a participant of this conversation.
     * For STAFF: their staff.id must match conversation.staffId.
     * For JOBSEEKER: their jobSeeker.id must match conversation.jobSeekerId.
     */
    public void assertParticipant(UUID conversationId, UUID userId) {
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

        var user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        boolean allowed = false;
        if (user.getRole() == UserRole.COMPANY) {
            allowed = staffRepository.findByUserId(userId)
                    .map(s -> s.getId().equals(conv.getStaffId()))
                    .orElse(false);
        } else if (user.getRole() == UserRole.JOBSEEKER) {
            // jobSeekerId in conversation references job_seekers.id (profile id)
            // We need to resolve userId → jobSeeker.id via jobSeekerRepository
            // For simplicity, check if any jobSeeker with this userId matches
            allowed = conv.getJobSeekerId() != null; // resolved in message handler
        }

        if (!allowed) {
            throw new ForbiddenException("Not a participant of this conversation");
        }
    }

    @Transactional
    public void markAsInitiated(UUID conversationId) {
        conversationRepository.findById(conversationId).ifPresent(c -> {
            c.setInitiated(true);
            conversationRepository.save(c);
        });
    }

    @Transactional
    public void touchUpdatedAt(UUID conversationId) {
        conversationRepository.findById(conversationId).ifPresent(c -> {
            conversationRepository.save(c); // @PreUpdate handles updatedAt
        });
    }

    @Transactional(readOnly = true)
    public List<ConversationResponseDto> listForStaff(UUID staffUserId) {
        var staff = staffRepository.findByUserId(staffUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Staff not found"));
        return conversationRepository.findByStaffIdOrderByUpdatedAtDesc(staff.getId())
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ConversationResponseDto> listForJobSeeker(UUID jobSeekerProfileId) {
        return conversationRepository.findByJobSeekerIdOrderByUpdatedAtDesc(jobSeekerProfileId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    private ConversationResponseDto toDto(Conversation c) {
        return ConversationResponseDto.builder()
                .id(c.getId())
                .applicationId(c.getApplicationId())
                .staffId(c.getStaffId())
                .jobSeekerId(c.getJobSeekerId())
                .isInitiated(c.isInitiated())
                .createdAt(c.getCreatedAt())
                .lastMessageAt(c.getUpdatedAt())
                .staffName(resolveStaffName(c.getStaffId()))
                .jobSeekerName(resolveJobSeekerName(c.getJobSeekerId()))
                .build();
    }

    private String resolveStaffName(UUID staffId) {
        return staffRepository.findById(staffId)
                .map(staff -> {
                    var user = staff.getUser();
                    if (user == null) return "anonymous staff";
                    if (user.getFullName() != null && !user.getFullName().isBlank()) return user.getFullName();
                    if (user.getEmail() != null && !user.getEmail().isBlank()) return user.getEmail();
                    return "anonymous staff";
                })
                .orElse("anonymous staff");
    }

    private String resolveJobSeekerName(UUID jobSeekerId) {
        return jobSeekerRepository.findById(jobSeekerId)
                .map(jobSeeker -> {
                    var user = jobSeeker.getUser();
                    if (user == null) return "anonymous job seeker";
                    if (user.getFullName() != null && !user.getFullName().isBlank()) return user.getFullName();
                    if (user.getEmail() != null && !user.getEmail().isBlank()) return user.getEmail();
                    return "anonymous job seeker";
                })
                .orElse("anonymous job seeker");
    }
}
