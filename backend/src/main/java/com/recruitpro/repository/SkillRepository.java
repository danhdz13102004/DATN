package com.recruitpro.repository;

import com.recruitpro.model.Skill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SkillRepository extends JpaRepository<Skill, UUID> {

    Optional<Skill> findByName(String name);

    Optional<Skill> findByNameIgnoreCase(String name);

    boolean existsByName(String name);

    @Query(value = "SELECT COUNT(*) FROM job_skills WHERE skill_id = :skillId", nativeQuery = true)
    long countJobsUsingSkill(@Param("skillId") UUID skillId);

    @Query(value = "SELECT COUNT(*) FROM job_seeker_skills WHERE skill_id = :skillId", nativeQuery = true)
    long countJobSeekersUsingSkill(@Param("skillId") UUID skillId);
}
