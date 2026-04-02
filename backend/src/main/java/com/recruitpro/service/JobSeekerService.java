package com.recruitpro.service;

import com.recruitpro.dto.response.JobSeekerProfileDto;
import com.recruitpro.exception.BadRequestException;
import com.recruitpro.exception.ResourceNotFoundException;
import com.recruitpro.model.JobSeeker;
import com.recruitpro.model.Skill;
import com.recruitpro.repository.JobSeekerRepository;
import com.recruitpro.repository.SkillRepository;
import com.recruitpro.storage.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class JobSeekerService {

    private final JobSeekerRepository jobSeekerRepository;
    private final SkillRepository skillRepository;
    private final StorageService storageService;

    /** Used by other services/controllers that need the raw entity (not serialized). */
    public JobSeeker findByUserId(UUID userId) {
        return jobSeekerRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Job seeker profile not found"));
    }

    private JobSeeker findEntityByUserId(UUID userId) {
        return findByUserId(userId);
    }

    /**
     * Public read — fetches user + skills eagerly via @EntityGraph then maps to a
     * safe DTO so Jackson never touches a Hibernate proxy.
     */
    @Transactional(readOnly = true)
    public JobSeekerProfileDto getProfile(UUID userId) {
        JobSeeker profile = jobSeekerRepository.findWithGraphByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Job seeker profile not found"));
        return toDto(profile);
    }

    @Transactional
    public JobSeekerProfileDto updateProfile(UUID userId, JobSeeker updates) {
        JobSeeker profile = findEntityByUserId(userId);
        if (updates.getBio() != null) profile.setBio(updates.getBio());
        if (updates.getLocation() != null) profile.setLocation(updates.getLocation());
        if (updates.getExperienceYears() != null) profile.setExperienceYears(updates.getExperienceYears());
        jobSeekerRepository.save(profile);
        return getProfile(userId);
    }

    @Transactional
    public JobSeekerProfileDto uploadAvatar(UUID userId, MultipartFile file) throws IOException {
        JobSeeker profile = findEntityByUserId(userId);
        String key = storageService.upload(
                "avatars", file.getOriginalFilename(),
                file.getInputStream(), file.getSize(), file.getContentType()
        );
        profile.setAvatarUrl(key);
        jobSeekerRepository.save(profile);
        return getProfile(userId);
    }

    // ── Skill management ────────────────────────────────

    @Transactional(readOnly = true)
    public Set<Skill> getSkills(UUID userId) {
        JobSeeker profile = findEntityByUserId(userId);
        profile.getSkills().size(); // force-initialize lazy collection
        return profile.getSkills();
    }

    @Transactional
    public Set<Skill> addSkill(UUID userId, String skillName) {
        if (skillName == null || skillName.trim().isEmpty()) {
            throw new BadRequestException("Skill name is required");
        }

        JobSeeker profile = findEntityByUserId(userId);

        Skill skill = skillRepository.findByNameIgnoreCase(skillName.trim())
                .orElseGet(() -> {
                    Skill newSkill = new Skill();
                    newSkill.setId(UUID.randomUUID());
                    newSkill.setName(skillName.trim());
                    return skillRepository.save(newSkill);
                });

        profile.getSkills().add(skill);
        jobSeekerRepository.save(profile);
        log.info("Added skill '{}' to job seeker (userId={})", skillName, userId);
        return profile.getSkills();
    }

    @Transactional
    public void removeSkill(UUID userId, UUID skillId) {
        JobSeeker profile = findEntityByUserId(userId);
        profile.getSkills().removeIf(s -> s.getId().equals(skillId));
        jobSeekerRepository.save(profile);
        log.info("Removed skill {} from job seeker (userId={})", skillId, userId);
    }

    // ── Mapping ────────────────────────────────────────

    private JobSeekerProfileDto toDto(JobSeeker js) {
        Set<JobSeekerProfileDto.SkillDto> skillDtos = js.getSkills().stream()
                .map(s -> JobSeekerProfileDto.SkillDto.builder()
                        .id(s.getId())
                        .name(s.getName())
                        .build())
                .collect(Collectors.toSet());

        return JobSeekerProfileDto.builder()
                .id(js.getId())
                .avatarUrl(storageService.getPublicUrl(js.getAvatarUrl()))  // resolve key → full URL
                .bio(js.getBio())
                .location(js.getLocation())
                .experienceYears(js.getExperienceYears())
                .skills(skillDtos)
                .createdAt(js.getCreatedAt())
                .updatedAt(js.getUpdatedAt())
                // Flatten user — no proxy access after this point
                .userId(js.getUser().getId())
                .email(js.getUser().getEmail())
                .fullName(js.getUser().getFullName())
                .role(js.getUser().getRole().name())
                .status(js.getUser().getStatus().name())
                .build();
    }
}
