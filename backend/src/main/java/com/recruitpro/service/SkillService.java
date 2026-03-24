package com.recruitpro.service;

import com.recruitpro.exception.DuplicateResourceException;
import com.recruitpro.exception.ResourceNotFoundException;
import com.recruitpro.model.Skill;
import com.recruitpro.repository.SkillRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SkillService {

    private final SkillRepository skillRepository;

    public List<Skill> findAll() {
        return skillRepository.findAll();
    }

    public Skill findById(UUID id) {
        return skillRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Skill not found"));
    }

    @Transactional
    public Skill create(String name) {
        if (skillRepository.existsByName(name)) {
            throw new DuplicateResourceException("Skill already exists: " + name);
        }
        Skill skill = Skill.builder().name(name).build();
        return skillRepository.save(skill);
    }

    @Transactional
    public Skill update(UUID id, String name) {
        Skill skill = findById(id);
        if (skillRepository.existsByName(name) && !skill.getName().equals(name)) {
            throw new DuplicateResourceException("Skill already exists: " + name);
        }
        skill.setName(name);
        return skillRepository.save(skill);
    }

    @Transactional
    public void delete(UUID id) {
        Skill skill = findById(id);
        skillRepository.delete(skill);
        log.info("Skill deleted: {}", skill.getName());
    }
}
