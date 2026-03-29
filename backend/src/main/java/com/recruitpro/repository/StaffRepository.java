package com.recruitpro.repository;

import com.recruitpro.model.Staff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface StaffRepository extends JpaRepository<Staff, UUID> {

    Optional<Staff> findByUserId(UUID userId);

    java.util.List<Staff> findAllByCompanyId(UUID companyId);
}
