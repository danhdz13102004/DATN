package com.recruitpro.repository;

import com.recruitpro.model.Payment;
import com.recruitpro.model.enums.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    Page<Payment> findAllByCompanyIdOrderByCreatedAtDesc(UUID companyId, Pageable pageable);

    Optional<Payment> findByStripeSessionIdAndStatus(String stripeSessionId, PaymentStatus status);

    Optional<Payment> findByStripeSessionId(String stripeSessionId);
}
