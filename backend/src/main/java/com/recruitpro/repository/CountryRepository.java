package com.recruitpro.repository;

import com.recruitpro.model.Country;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CountryRepository extends JpaRepository<Country, Long> {

    Optional<Country> findByIso2(String iso2);

    boolean existsByName(String name);
}
