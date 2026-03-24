package com.recruitpro.repository;

import com.recruitpro.model.CompanyAddress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CompanyAddressRepository extends JpaRepository<CompanyAddress, UUID> {

    List<CompanyAddress> findAllByCompanyId(UUID companyId);
}
