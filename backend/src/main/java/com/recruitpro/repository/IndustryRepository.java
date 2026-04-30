package com.recruitpro.repository;

import com.recruitpro.model.Industry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface IndustryRepository extends JpaRepository<Industry, UUID> {
}
