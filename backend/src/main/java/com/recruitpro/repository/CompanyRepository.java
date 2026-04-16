package com.recruitpro.repository;

import com.recruitpro.model.Company;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface CompanyRepository extends JpaRepository<Company, UUID> {

    Page<Company> findAll(Pageable pageable);

    @Query("SELECT c FROM Company c WHERE (cast(:verified as boolean) IS NULL OR c.verified = :verified) AND c.deletedAt IS NULL")
    Page<Company> findAllByVerified(@Param("verified") Boolean verified, Pageable pageable);

    long countByVerified(boolean verified);
}
