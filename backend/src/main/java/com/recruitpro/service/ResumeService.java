package com.recruitpro.service;

import com.recruitpro.exception.ForbiddenException;
import com.recruitpro.exception.ResourceNotFoundException;
import com.recruitpro.model.Resume;
import com.recruitpro.repository.ResumeRepository;
import com.recruitpro.storage.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ResumeService {

    private final ResumeRepository resumeRepository;
    private final StorageService storageService;

    public List<Resume> findByJobSeekerId(UUID jobSeekerId) {
        return resumeRepository.findAllByJobSeekerId(jobSeekerId);
    }

    public Resume findById(UUID id) {
        return resumeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resume not found"));
    }

    @Transactional
    public Resume upload(UUID jobSeekerId, MultipartFile file, String label) throws IOException {
        String key = storageService.upload(
                "resumes", file.getOriginalFilename(),
                file.getInputStream(), file.getSize(), file.getContentType()
        );

        Resume resume = Resume.builder()
                .jobSeekerId(jobSeekerId)
                .fileUrl(key)
                .label(label)
                .fileSize(file.getSize())
                .build();

        Resume saved = resumeRepository.save(resume);
        log.info("Resume uploaded: {} (seekerId={}, label={})", saved.getId(), jobSeekerId, label);

        // TODO: Trigger AI service to parse text and generate embedding

        return saved;
    }

    public String getDownloadUrl(UUID id) {
        Resume resume = findById(id);
        return storageService.getDownloadUrl(resume.getFileUrl());
    }

    @Transactional
    public Resume replace(UUID id, UUID jobSeekerId, MultipartFile file, String label) throws IOException {
        Resume resume = findById(id);
        if (!resume.getJobSeekerId().equals(jobSeekerId)) {
            throw new ForbiddenException("You do not own this resume");
        }

        if (file != null && !file.isEmpty()) {
            String key = storageService.upload(
                    "resumes", file.getOriginalFilename(),
                    file.getInputStream(), file.getSize(), file.getContentType()
            );
            resume.setFileUrl(key);
            resume.setFileSize(file.getSize());
        }

        if (label != null) {
            resume.setLabel(label);
        }

        Resume saved = resumeRepository.save(resume);
        log.info("Resume replaced: {} (seekerId={})", id, jobSeekerId);
        return saved;
    }

    @Transactional
    public Resume setPrimary(UUID id, UUID jobSeekerId) {
        Resume resume = findById(id);
        if (!resume.getJobSeekerId().equals(jobSeekerId)) {
            throw new ForbiddenException("You do not own this resume");
        }

        // Unset all other primary resumes for this seeker
        List<Resume> all = resumeRepository.findAllByJobSeekerId(jobSeekerId);
        for (Resume r : all) {
            if (r.getIsPrimary()) {
                r.setIsPrimary(false);
                resumeRepository.save(r);
            }
        }

        resume.setIsPrimary(true);
        return resumeRepository.save(resume);
    }

    @Transactional
    public void softDelete(UUID id, UUID jobSeekerId) {
        Resume resume = findById(id);
        if (!resume.getJobSeekerId().equals(jobSeekerId)) {
            throw new ForbiddenException("You do not own this resume");
        }
        resume.setDeletedAt(Instant.now());
        resumeRepository.save(resume);
        log.info("Resume soft-deleted: {}", id);
    }
}
