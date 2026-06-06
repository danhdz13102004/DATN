package com.recruitpro.repository;

import com.recruitpro.model.Industry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface IndustryRepository extends JpaRepository<Industry, UUID> {

    boolean existsByName(String name);

    @Query(value = "SELECT COUNT(*) FROM jobs WHERE industry_id = :industryId", nativeQuery = true)
    long countJobsByIndustry(@Param("industryId") UUID industryId);
}
