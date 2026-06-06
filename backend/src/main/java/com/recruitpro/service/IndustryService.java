package com.recruitpro.service;

import com.recruitpro.exception.BadRequestException;
import com.recruitpro.exception.ResourceNotFoundException;
import com.recruitpro.model.Industry;
import com.recruitpro.repository.IndustryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class IndustryService {

    private final IndustryRepository industryRepository;

    public List<Industry> findAll() {
        return industryRepository.findAll();
    }

    public Industry findById(UUID id) {
        return industryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Industry not found"));
    }

    @Transactional
    public Industry create(String name) {
        if (industryRepository.existsByName(name)) {
            throw new BadRequestException("Industry already exists: " + name);
        }
        Industry industry = Industry.builder().name(name).build();
        return industryRepository.save(industry);
    }

    @Transactional
    public Industry update(UUID id, String name) {
        Industry industry = findById(id);
        if (industryRepository.existsByName(name) && !industry.getName().equals(name)) {
            throw new BadRequestException("Industry already exists: " + name);
        }
        industry.setName(name);
        return industryRepository.save(industry);
    }

    @Transactional
    public void delete(UUID id) {
        Industry industry = findById(id);
        long usageCount = industryRepository.countJobsByIndustry(id);
        if (usageCount > 0) {
            throw new BadRequestException(
                    "Cannot delete industry \"" + industry.getName() +
                    "\" because it is currently used by " + usageCount + " job(s). " +
                    "Please reassign or remove those jobs first.");
        }
        industryRepository.delete(industry);
        log.info("Industry deleted: {}", industry.getName());
    }

    public long getJobUsageCount(UUID id) {
        findById(id);
        return industryRepository.countJobsByIndustry(id);
    }
}
