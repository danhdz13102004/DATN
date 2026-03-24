package com.recruitpro.service;

import com.recruitpro.exception.ResourceNotFoundException;
import com.recruitpro.model.JobSeeker;
import com.recruitpro.repository.JobSeekerRepository;
import com.recruitpro.security.UserPrincipal;
import com.recruitpro.storage.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class JobSeekerService {

    private final JobSeekerRepository jobSeekerRepository;
    private final StorageService storageService;

    public JobSeeker findByUserId(UUID userId) {
        return jobSeekerRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Job seeker profile not found"));
    }

    @Transactional
    public JobSeeker updateProfile(UUID userId, JobSeeker updates) {
        JobSeeker profile = findByUserId(userId);
        if (updates.getBio() != null) profile.setBio(updates.getBio());
        if (updates.getLocation() != null) profile.setLocation(updates.getLocation());
        if (updates.getExperienceYears() != null) profile.setExperienceYears(updates.getExperienceYears());
        return jobSeekerRepository.save(profile);
    }

    @Transactional
    public JobSeeker uploadAvatar(UUID userId, MultipartFile file) throws IOException {
        JobSeeker profile = findByUserId(userId);
        String key = storageService.upload(
                "avatars", file.getOriginalFilename(),
                file.getInputStream(), file.getSize(), file.getContentType()
        );
        profile.setAvatarUrl(key);
        return jobSeekerRepository.save(profile);
    }
}
