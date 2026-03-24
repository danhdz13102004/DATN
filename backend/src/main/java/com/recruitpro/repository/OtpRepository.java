package com.recruitpro.repository;

import com.recruitpro.model.Otp;
import com.recruitpro.model.enums.OtpType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OtpRepository extends JpaRepository<Otp, UUID> {

    Optional<Otp> findTopByEmailAndTypeAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
            String email, OtpType type, Instant now
    );

    boolean existsByEmailAndCreatedAtAfter(String email, Instant since);
}
